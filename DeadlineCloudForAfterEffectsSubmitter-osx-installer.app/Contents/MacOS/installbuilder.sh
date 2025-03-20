#!/bin/sh

runtimes_dir=$(cd "$(dirname "${0}")" && pwd)
os_version=`uname -r`
machine_platform=`uname -p`
machine_arch=`uname -m`
if [ "${os_version:0:1}" == "6" ];then
    executable="none"
elif [ "${machine_platform}" == "arm" ];then

  runtimes="osx-arm64 osx-x86_64"
  executable=none
  for r in ${runtimes} ; do
    if [ -f "${runtimes_dir}/${r}" ]; then
      executable=${r}
      break
    fi
  done

elif [ "${machine_platform}" == "i386" ];then
  executable=osx-x86_64
else
    executable="none"
fi

if [ "$executable" == "none" ]; then
    echo "The current OS X version is not supported"
    exit 1
fi
            
        "`dirname \"${0}\"`/$executable" "$@"