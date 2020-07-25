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
      const searchQuery: string = core.getInput('searchquery')
      core.debug(`Searaching issues with query: ${searchQuery}`)

      const issuesDirPath = path.join('.', 'issues');
      io.mkdirP(issuesDirPath);

      const issuesDownloadDirPath = path.join('.', 'issues_download');
      io.mkdirP(issuesDownloadDirPath);

      const token = core.getInput('repotoken', { required: true });
      const gh = octokit.getOctokit(token);

      const i = await gh.search.issuesAndPullRequests({
        q: searchQuery
      });

      core.debug(`search issues: (${i.status}) ${i.data.total_count} results`);

      const files = [];

      for (const issue of i.data.items) {
        core.debug(`${JSON.stringify(issue.html_url)}`);
        const filePath = path.join('.', 'issues', `${issue.number}.json`);
        fs.writeFileSync(filePath, JSON.stringify(issue));
        files.push(filePath);
      }

      for (const fileName of fs.readdirSync(issuesDirPath)) {
        core.debug(`Wrote file: ${path.join(issuesDirPath, fileName)}`);
      }

      const artifactClient = artifact.create();
      const artifactName = `issueoutput_${process.env['GITHUB_RUN_ID']}`;
      const rootDirectory = issuesDirPath
      const options = {
        continueOnError: true
      }

      const uploadResult = await artifactClient.uploadArtifact(artifactName, files, rootDirectory, options)
      core.debug(`uploaded ${uploadResult.artifactItems.length} artifacts...`);

      await artifactClient.downloadArtifact(artifactName, issuesDownloadDirPath);
      for (const fileName of fs.readdirSync(issuesDownloadDirPath)) {
        core.debug(`Found file: ${path.join(issuesDownloadDirPath, fileName)}`);
      }

      // const ms = await gh.issues.getMilestone({
      //   milestone_number: 1,
      //   owner: 'christothes',
      //   repo: 'IssueOutputAction'
      // });

      // core.debug(ms.data.title);
      // core.debug(`${ms.data.open_issues} open issues.`);

      await wait(10);
    } catch (err) {
      core.debug(err);
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
