$repo = 'hy4k/fetscash'
$workflow = 'validate-bicep.yml'

# get latest run id
$id = gh run list --repo $repo --workflow $workflow --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $id) {
  Write-Host 'No runs found'
  exit 0
}
Write-Host "Found run: $id"

for ($i = 0; $i -lt 120; $i++) {
  $sRaw = gh run view $id --repo $repo --json status,conclusion
  $s = $sRaw | ConvertFrom-Json
  $stat = "$($s.status) $($s.conclusion)"
  Write-Host "poll $i -> $stat"
  if ($stat -and ($stat -notlike '*waiting*') -and ($stat -notlike '*in_progress*') -and ($stat -notlike '*queued*')) { break }
  Start-Sleep -Seconds 5
}

# output full logs
gh run view $id --repo $repo --log
