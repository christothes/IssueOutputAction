import * as core from '@actions/core'
import * as octokit from '@actions/github'
import * as io from '@actions/io'
import * as artifact from '@actions/artifact'
import { wait } from './wait'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'

async function run(): Promise<void> {
  try {
    try {
      const milestone: string = core.getInput('milestone')
      core.debug(`Filtering on milestone: ${milestone}..`)

      const state: string = core.getInput('state')
      core.debug(`Filtering on state: ${state}.`)

      const notmodifiedfor: string = core.getInput('notmodifiedfor')
      core.debug(`Filtering on notmodifiedfor: ${notmodifiedfor}.`)

      const issuesDirPath = path.join('.', 'issues');
      io.mkdirP(issuesDirPath);

      const token = core.getInput('repotoken', { required: true });
      const gh = octokit.getOctokit(token);

      const i = await gh.search.issuesAndPullRequests({
        q: `milestone:"${milestone}" repo:christothes/IssueOutputAction`
      });

      core.debug(`search issues: (${i.status}) ${i.data.total_count} results`);

      const files = [];

      for (const issue of i.data.items) {
        core.debug(`${JSON.stringify(issue.html_url)}`);
        const filePath = path.join('.', 'issues', `${issue.number}.json`);
        fs.writeFileSync(filePath, JSON.stringify(issue));
        files.push(filePath);
      }

      const artifactClient = artifact.create()
      const artifactName = `issueoutput${process.env['GITHUB_RUN_ID']}`;
      const rootDirectory = issuesDirPath
      const options = {
        continueOnError: true
      }

      const uploadResult = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
      core.debug(`uploaded ${uploadResult.artifactItems.length} artifacts...`);

      const ms = await gh.issues.getMilestone({
        milestone_number: 1,
        owner: 'christothes',
        repo: 'IssueOutputAction'
      });

      core.debug(ms.data.title);
      core.debug(`${ms.data.open_issues} open issues.`);

      await wait(10);
    } catch (err) {
      core.debug(err);
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
