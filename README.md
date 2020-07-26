<p align="center">
  <a href="https://github.com/christothes/IssueOutputAction"><img alt="typescript-action status" src="https://github.com/actions/typescript-action/workflows/build-test/badge.svg"></a>
</p>

# Search Issues and Output as an Artifact

Searches Issues based on configured criteria and outputs the results as json per issue into an Artifact. Stacks with other actions that expect a set of Issues as an Artifact.

### Building and testing

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run pack
```

Run the tests :heavy_check_mark:  
```bash
$ npm run test
```

### Usage

See [action.yml](./action.yml) For comprehensive list of options.
 
Basic:
```yaml
name: "Search and output issues"
on:
  schedule:
  - cron: "0 0 * * *"

jobs:
  search:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/IssueOutputAction@v1.0
      with:
        repotoken: ${{ secrets.GITHUB_TOKEN }}
        searchquery: 'event hubs is:open'
        repoOwnerAndName: 'Azure/azure-sdk-for-net'
```
 
Configure milestone filters (filter searched issues to only those associated to an open milestone with a due date in the future):
```yaml
name: "Search and output issues"
on:
  schedule:
  - cron: "0 0 * * *"

jobs:
  search:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/IssueOutputAction@v1.0
      with:
        repotoken: ${{ secrets.GITHUB_TOKEN }}
        searchquery: 'event hubs is:open'
        repoOwnerAndName: 'Azure/azure-sdk-for-net'
        searchByAssociatedMilestoneState: 'open'
        searchByAssociatedMilestoneDueDate: 'future'
```

### Debugging

To see debug output from this action, you must set the secret `ACTIONS_STEP_DEBUG` to `true` in your repository.