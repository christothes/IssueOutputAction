import { wait } from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(5)
  const end = new Date()
  var delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(1)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  //process.env['INPUT_SEARCHQUERY'] = 'milestone:"August Release" repo:christothes/IssueOutputAction'
  process.env['INPUT_SEARCHQUERY'] = ' event hubs is:open'
  process.env['INPUT_REPOOWNERANDNAME'] = 'Azure/azure-sdk-for-net'
  process.env['INPUT_searchByAssociatedMilestoneState'] = 'open'
  process.env['INPUT_SEARCHBYASSOCIATEDMILESTONEDUEDATE'] = 'past'
  // process.env['https_proxy'] = 'http://127.0.0.1:8888'
  // process.env['http_proxy'] = 'http://127.0.0.1:8888'
  // process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }
  console.log(cp.execSync(`node ${ip}`, options).toString())
})
