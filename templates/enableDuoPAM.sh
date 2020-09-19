#!/bin/sh
# Configure PAM modules | removed from setup, because it breaks authentication if DUO is not configured properly
if grep -q "duo" sshd; then
	echo "No patching needed"
else
	sed '/^@include common-auth.*/a auth  required pam_permit.so' -i sshd
	sed '/^@include common-auth.*/a auth  requisite pam_deny.so' -i sshd
	sed '/^@include common-auth.*/a auth  \[success=1 default=ignore\] pam_duo.so' -i sshd
fi

if [ $1 = "disable_password" ]; then
	sed 's/^@include common-auth.*/#@include common-auth/g' -i sshd
fi