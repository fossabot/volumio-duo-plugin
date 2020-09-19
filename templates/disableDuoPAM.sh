#!/bin/sh
# Configure PAM modules | removed from setup, because it breaks authentication if DUO is not configured properly
if grep -q "duo" sshd; then
	sed '/^auth  required pam_permit.so.*/d' -i sshd
	sed '/^auth  requisite pam_deny.so.*/d' -i sshd
	sed '/^auth  \[success=1 default=ignore\] pam_duo.so.*/d' -i sshd
	sed 's/^#@include common-auth.*/@include common-auth/g' -i sshd
fi