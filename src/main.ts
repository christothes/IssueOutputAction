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
      const regexp = /^[\w-]+\/[\w-]+$/g;
      if (!regexp.test(repoOwnerAndName)) {
        core.setFailed('Invalid repoOwnerAndName');
        return;
      }

      const milestoneStateTmp: string = core.getInput('searchByAssociatedMilestoneState');
      let milestoneState: "open" | "closed" | "all" | undefined;
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
      let milestoneDueOn: "past" | "today" | "future" | undefined;
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
      if (!miletoneOptionsSpecified && searchQuery.length == 0) {
        core.setFailed('Must specify at least one search or milesone filter input.');
      }

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

        const now = new Date();

        for (const milestone of azMilestones.data) {
          if (milestoneDueOn) {
            const dueOn = milestone.due_on ? new Date(milestone.due_on) : undefined;
            switch (milestoneDueOn) {
              case "future":
                if (!dueOn || !moment(dueOn).isAfter(now, 'day')) {
                  continue;
                }
                break;
              case "past":
                if (!dueOn || !moment(dueOn).isBefore(now, 'day')) {
                  continue;
                }
                break;
              case "today":
                if (!dueOn || !moment(dueOn).isSame(now, 'day')) {
                  continue;
                }
                break;
              default:
                break;
            }
          }
          core.debug(`Searching Issues related to Milestone: ${milestone.title}`);
          const queryWithMilestone = `${searchQuery} milestone:"${milestone.title}" repo:${repoOwnerAndName}`;
          await queryIssues(queryWithMilestone, repoOwnerAndName, token, issues);
        }
      }
      else {
        // Get query results
        const queryWithoutMilestones = `${searchQuery} repo:${repoOwnerAndName}`;
        await queryIssues(queryWithoutMilestones, repoOwnerAndName, token, issues);
      }

      // Handle artifacts
      const issuesDirPath = path.join('.', 'issues');
      try {
        fs.rmdirSync(issuesDirPath, { recursive: true });
      } catch (err) { core.debug(err) }
      await io.mkdirP(issuesDirPath);

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

async function queryIssues(resultingQuery: string, ownerAndName: string, token: string, issues: any[]) : Promise<void> {

  core.debug(`resultingQuery: ${resultingQuery}.`);

  let pageNum = 1;
  let isIncomplete = true;
  let itemsReceived = 0;

  while (isIncomplete) {
    const issueResults = await axios.default.get('https://api.github.com/search/issues',
      {
        headers: {
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

