#!/bin/bash

sudo apt-get update && sudo apt-get install -y checkinstall libssl-dev libpam-dev gcc

# Fetch latest version from DUO
wget https://dl.duosecurity.com/duo_unix-latest.tar.gz
tar zxf duo_unix-latest.tar.gz

# CHANGE THIS VALUE FOR DIFFERENT VERSIONS
cd duo_unix-1.11.4/

./configure --with-pam --prefix=/usr && make 

# Package description examples
# Cisco DUO (duo_unix) for Volumio x86 (Jessie)
# Cisco DUO (duo_unix) for Volumio on armhf platforms (Buster)
echo "Cisco DUO (duo_unix) for Volumio on armhf platforms (Buster)" | sudo tee description-pak

sudo make install

# Maintainer: you
# License: GNUv2
# Package group: duo
sudo checkinstall -D -y --maintainer Saiyato --pkggroup duo --pkglicense GNUv2 --nodoc make install

# volumio@volumio4:~/duo_unix-1.11.4$ sudo dpkg --info duo-unix_1.11.4-1_armhf.deb
# new Debian package, version 2.0.
# size 129864 bytes: control archive=388 bytes.
       # 0 bytes,     0 lines      conffiles
     # 280 bytes,    10 lines      control
# Package: duo-unix
# Priority: extra
# Section: duo
# Installed-Size: 515
# Maintainer: Saiyato
# Architecture: armhf
# Version: 1.11.4-1
# Provides: duo-unix
# Description: Cisco DUO (duo_unix) for Volumio on armhf platforms (Buster)
 # Cisco DUO (duo_unix) for Volumio on armhf platforms (Buster)
