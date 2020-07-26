import * as core from '@actions/core'
import * as octokit from '@actions/github'
import * as io from '@actions/io'
import * as artifact from '@actions/artifact'
import * as fs from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as axios from 'axios'
import moment from 'moment'

async function run(): Promise<void> {
  try {
    try {
      const searchQuery: string = core.getInput('searchQuery')
      core.debug(`Searaching issues with query: ${searchQuery}`)

      const repoOwnerAndName: string = core.getInput('repoOwnerAndName');
      core.debug(`Repo Owner/Name: ${repoOwnerAndName}`);
      const regexp: RegExp = /^[\w-]+\/[\w-]+$/g;
      if (!regexp.test(repoOwnerAndName)) {
        core.setFailed('Invalid repoOwnerAndName');
        return;
      }

      const milestoneStateTmp: string = core.getInput('searchByAssociatedMilestoneState');
      var milestoneState: "open" | "closed" | "all" | undefined;
      switch (milestoneStateTmp) {
        case "all":
          milestoneState = "all";
          break;
        case "closed":
          milestoneState = "closed";
          break;
        case "open":
          milestoneState = "open";
          break;
        default:
          milestoneState = undefined;
      };
      core.debug(`Filtering issues with milestoneState: ${milestoneState}`);

      const milestoneDueOnTmp: string = core.getInput('searchByAssociatedMilestoneDueDate');
      var milestoneDueOn: "past" | "today" | "future" | undefined;
      switch (milestoneDueOnTmp) {
        case "past":
          milestoneDueOn = "past";
          break;
        case "today":
          milestoneDueOn = "today";
          break;
        case "future":
          milestoneDueOn = "future";
          break;
        default:
          milestoneDueOn = undefined;
      };
      core.debug(`Filtering issues with milestoneDueOn: ${milestoneDueOn}`);

      const miletoneOptionsSpecified = milestoneDueOn || milestoneState;

      const token = core.getInput('repotoken', { required: true });
      const gh = octokit.getOctokit(token);

      const issues: any[] = [];

      const ownerAndName = repoOwnerAndName.split("/");

      // Get Milestones
      if (miletoneOptionsSpecified) {
        const azMilestones = await gh.issues.listMilestones({
          state: milestoneState,
          owner: ownerAndName[0],
          repo: ownerAndName[1]
        });

        var now = new Date();

        for (const milestone of azMilestones.data) {
          if (milestoneDueOn) {
            const due_on = milestone.due_on ? new Date(milestone.due_on) : undefined;
            switch (milestoneDueOn) {
              case "future":
                if (!due_on || !moment(due_on).isAfter(now, 'day')) {
                  continue;
                }
                break;
              case "past":
                if (!due_on || !moment(due_on).isBefore(now, 'day')) {
                  continue;
                }
                break;
              case "today":
                if (!due_on || !moment(due_on).isSame(now, 'day')) {
                  continue;
                }
                break;
              default:
                break;
            }
          }
          core.debug(`Searching Issues related to Milestone: ${milestone.title}`);
          const queryWithMilestone = `${searchQuery} milestone:"${milestone.title}" repo:${repoOwnerAndName}`;
          await queryIssues(queryWithMilestone, repoOwnerAndName, miletoneOptionsSpecified, token, issues);
        }
      }
      else {
        // Get query results
        const queryWithoutMilestones = `${searchQuery} repo:${repoOwnerAndName}`;
        await queryIssues(queryWithoutMilestones, repoOwnerAndName, miletoneOptionsSpecified, token, issues);
      }



      // Handle artifacts
      const issuesDirPath = path.join('.', 'issues');
      try {
        fs.rmdirSync(issuesDirPath, { recursive: true });
      } catch (err) { console.log(err) }
      await io.mkdirP(issuesDirPath);

      const issuesDownloadDirPath = path.join('.', 'issues_download');
      try {
        fs.rmdirSync(issuesDownloadDirPath, { recursive: true });
      } catch{ }
      await io.mkdirP(issuesDownloadDirPath);

      const files = [];

      for (const issue of issues) {
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
      core.setOutput("issuesArtifact", artifactName);

    } catch (err) {
      core.debug(err);
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

async function queryIssues(resultingQuery: string, ownerAndName: string, miletoneOptionsSpecified: string | undefined, token: string, issues: any[]) {

  core.debug(`resultingQuery: ${resultingQuery}.`);

  var pageNum = 1;
  var isIncomplete = true;
  var itemsReceived = 0;

  while (isIncomplete) {
    const issueResults = await axios.default.get('https://api.github.com/search/issues',
      {
        headers:{
          Auth: token
        },
        params: {
          q: resultingQuery,
          page: pageNum
        }
      })

    itemsReceived += issueResults.data.items.length;
    isIncomplete = itemsReceived < issueResults.data.total_count;
    for (const issue of issueResults.data.items) {
      if (issue.repository_url.endsWith(ownerAndName)) {
        issues.push(issue);
      }
    }
    core.debug(`search issues by query: (${issueResults.status}) ${itemsReceived} of ${issueResults.data.total_count} results from page #${pageNum} incomplete:${isIncomplete} totalIssues:${issues.length}`);
    pageNum++;
  }
}

