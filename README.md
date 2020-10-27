# volumio-duo-plugin
A DUO plugin compiled for Volumio (Debian Jessie) on 32-bit ARM (Raspberry Pi to be precise) platforms and x86 machines. Other platforms might follow, but I will need resources to compile and test.
More information on Volumio can be found here: https://volumio.org/

## Why?
This plugin adds two-factor authentication (2FA) for SSH sessions to your Volumio device. At this moment there are still some issues when changing the password, as some hard-coded functions require the default password. However, security can be hardened by adding two-factor authentication to (at least) starting SSH sessions.

## How?
The plugin will take care of the heavy lifting, it will install a pre-compiled binary (base on DUO's source code; read the official documentation for more info) and prepare necessary configuration. The plugin settings page will allow you to fill in your integration settings (integration key, secret key and API hostname; amongst others). You can turn off DUO authentication by flicking the 'enable DUO' switch to off position. Finally the PAM configuration for the SSH daemon is patched, based on the selected options in the plugin. By default DUO will fail-open, so you will not brick your system if you accidentally misconfig (I do advise against doing so ;) ).

Official DUO documentation can be found here: https://duo.com/docs/duounix#test-pam_duo

### PAM modules
```
# Standard Un*x authentication.
@include common-auth
auth  [success=1 default=ignore] pam_duo.so
auth  requisite pam_deny.so
auth  required pam_permit.so
```

## What?
As said the plugin will enable DUO 2FA for starting/authenticating SSH sessions.

The login prompt will still look the same
![Alt text](/images/duo_login_volumio.png?raw=true "Volumio login prompt screen")

Until you fill in both username and password (the latter is optional, see plugin settings screen) and you will receive a prompt on your phone (if configured obviously). It will show on the screen that a request has been pushed, when logging in, it will appear to be hanging.
![Alt text](/images/duo_logged_in_volumio.png?raw=true "Volumio logged in screen")

As said you will receive a nice push message, with a pop-up describing the push
![Alt text](/images/duo_ios_popup.jpeg?raw=true "Push pop-up example")
You only need to confirm by pressing the big green button (bottom left)
![Alt text](/images/duo_push_msg.jpeg?raw=true "DUO authentication request example")

You can follow authentication requests in your DUO dashboard (Reports)
![Alt text](/images/duo_auth_log.png?raw=true "DUO authentication report example")

## Prepare you DUO account
Obviously you will need an account, just register at DUO: https://duo.com/pricing/duo-free

When logged in, you can create an application you would like to protect with DUO. For SSH you should select 'UNIX Application', scroll down to settings to give it a name you can recognize (I named mine 'Volumio SSH'). Fill in the integration and secret key in the plugin, just like the API hostname, saving the settings will publish the DUO config to the PAM-module. Note that if your mobile device has not been enrolled, you can trigger the enrollment by opening an SSH session (I had some issues, so I disabled password for the time being and connected while passing the username: `ssh volumio@{volumio-ip}`). Follow the URL (open in your browser) and enroll your device. That's it! You can protect your Volumio device's SSH sessions with DUO.

### Advanced
If you're actively using DUO, you can alias the volumio username to your user. That way the authentication will reflect as you, instead of unknown (or you can create a volumio user in the dashboard). Obviously you can play around with policies as well, to make sure you tighten security as much as possible without compromising ease-of-use.

## I don't trust you, I want to compile the binaries myself!
Sure, in security it's quite common (and possibly healthy, at times) to distrust precompiled packages. Therefore you're more than welcome to compile your own binaries, just `./configure`, `make` and `make install` to overwrite the binaries in the prepared plugin.

You'll need some packages to satisfy dependencies
`sudo apt-get update && sudo apt-get install -y libssl-dev libpam-dev`

Download and unzip DUO source
`wget https://dl.duosecurity.com/duo_unix-latest.tar.gz`
`tar zxf duo_unix-latest.tar.gz`

Enter the directory and configure (with PAM and SSL), then make and install
`./configure --with-pam --prefix=/usr && make && sudo make install`

Have fun!