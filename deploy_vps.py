import paramiko, io, tarfile, os

host = '72.61.171.192'
user = 'root'
pwd = 'Suspended00@'
local_dir = 'dist'
remote_dir = '/var/www/html/fets.cash/public_html'

print('Connecting to VPS...')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=pwd, timeout=30)
print('Connected.')

buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode='w:gz') as tar:
    tar.add(local_dir, arcname='.')
buf.seek(0)
print(f'Tar created: {buf.getbuffer().nbytes} bytes')

sftp = ssh.open_sftp()
remote_tar = '/tmp/fetscash_dist.tar.gz'
with sftp.file(remote_tar, 'wb') as f:
    f.write(buf.read())
print('Uploaded tar.')

cmd = f"""
cd {remote_dir}
tar xzf {remote_tar} --overwrite
rm -f roster.html
rm {remote_tar}
echo DEPLOY_OK
ls -la
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode()
err = stderr.read().decode()
print('STDOUT:', out)
if err.strip():
    print('STDERR:', err)

ssh.close()
print('Done.')
