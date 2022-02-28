#!/bin/bash

# Must be logged to docker hub:
# docker login -u cyphernode

# Must enable experimental cli features
# "experimental": "enabled" in ~/.docker/config.json

image() {
  local arch=$1

  echo "Building and pushing cyphernode/batcher for $arch tagging as ${version}..."

  docker build --no-cache -t cyphernode/batcher:${arch}-${version} . \
  && docker push cyphernode/batcher:${arch}-${version}

  return $?
}

manifest() {
  echo "Creating and pushing manifest for cyphernode/batcher for version ${version}..."

  docker manifest create cyphernode/batcher:${version} \
                         cyphernode/batcher:${x86_docker}-${version} \
                         cyphernode/batcher:${arm_docker}-${version} \
                         cyphernode/batcher:${aarch64_docker}-${version} \
  && docker manifest annotate cyphernode/batcher:${version} cyphernode/batcher:${arm_docker}-${version} --os linux --arch ${arm_docker} \
  && docker manifest annotate cyphernode/batcher:${version} cyphernode/batcher:${x86_docker}-${version} --os linux --arch ${x86_docker} \
  && docker manifest annotate cyphernode/batcher:${version} cyphernode/batcher:${aarch64_docker}-${version} --os linux --arch ${aarch64_docker} \
  && docker manifest push -p cyphernode/batcher:${version}

  return $?
}

x86_docker="amd64"
arm_docker="arm"
aarch64_docker="arm64"

version="v0.2.0"

# Build amd64 and arm64 first, building for arm will trigger the manifest creation and push on hub

echo -e "\nBuild ${v3} for:\n"
echo "1) AMD 64 bits (Most PCs)"
echo "2) ARM 64 bits (RPi4, Mac M1)"
echo "3) ARM 32 bits (RPi2-3)"
echo -en "\nYour choice (1, 2, 3): "
read arch_input

case "${arch_input}" in
  1)
    arch_docker=${x86_docker}
    ;;
  2)
    arch_docker=${aarch64_docker}
    ;;
  3)
    arch_docker=${arm_docker}
    ;;
  *)
    echo "Not a valid choice."
    exit 1
    ;;
esac

echo -e "\nBuilding Batcher cypherapp\n"
echo -e "arch_docker=$arch_docker\n"

image ${arch_docker}

[ $? -ne 0 ] && echo "Error" && exit 1

[ "${arch_docker}" = "${x86_docker}" ] && echo "Built and pushed ${arch_docker} only" && exit 0
[ "${arch_docker}" = "${aarch64_docker}" ] && echo "Built and pushed ${arch_docker} only" && exit 0
[ "${arch_docker}" = "${arm_docker}" ] && echo "Built and pushed images, now building and pushing manifest for all archs..."

manifest

[ $? -ne 0 ] && echo "Error" && exit 1
