import * as core from '@actions/core'
import * as octokit from '@actions/github'
import * as io from '@actions/io'
import { wait } from './wait'
import * as fs from 'fs'
import * as path from 'path'

async function run(): Promise<void> {
  try {
    try {
      const milestone: string = core.getInput('milestone')
      core.debug(`Filtering on milestone: ${milestone}..`)

      const state: string = core.getInput('state')
      core.debug(`Filtering on state: ${state}.`)

      const notmodifiedfor: string = core.getInput('notmodifiedfor')
      core.debug(`Filtering on notmodifiedfor: ${notmodifiedfor}.`)

      io.mkdirP(path.join('.', 'issues'));

      const gh = octokit.getOctokit(core.getInput('repotoken'));

      const i = await gh.search.issuesAndPullRequests({
        q: `milestone:"${milestone}" repo:christothes/IssueOutputAction`
      });

      core.debug(`search issues: (${i.status}) ${i.data.total_count} results`);
      for (let index = 0; index < i.data.items.length; index++) {
        const issue = i.data.items[index];
        core.debug(`${JSON.stringify(issue.html_url)}`);
        fs.writeFileSync(path.join('.', 'issues', `${issue.number}.json`), JSON.stringify(issue))
      }

      const ms = await gh.issues.getMilestone({
        milestone_number: 1,
        owner: 'christothes',
        repo: 'IssueOutputAction'
      });

      core.debug(ms.data.title);
      core.debug(`${ms.data.open_issues} open issues.`);

      await wait(10);
    } catch (err)
    {
      core.debug(err);
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
