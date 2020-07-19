import * as core from '@actions/core'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    const milestone: string = core.getInput('milestone')
    core.debug(`Filtering on milestone: ${milestone}.`)

    const state: string = core.getInput('state')
    core.debug(`Filtering on state: ${state}.`)

    const notmodifiedfor: string = core.getInput('notmodifiedfor')
    core.debug(`Filtering on notmodifiedfor: ${notmodifiedfor}.`)


    core.debug(new Date().toTimeString());
    await wait(1);
    core.debug(new Date().toTimeString());

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
