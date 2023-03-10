# Description

Please include a summary of the change and if relevant which issue is fixed. Please also include relevant motivation and context.

## Type of change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Dependency changes
- [ ] Code refactor / cleanup
- [ ] Documentation or wording changes
- [ ] Other

## How should this be tested?

Please provide instructions so we can test. Please also list any relevant details for your test configuration.

- [ ] Test A
- [ ] Test B

## Checklist:

- [ ] I have performed a self-review of my own code
- [ ] I have requested at least 1 review (If the PR is significant enough, use best judgement here)
- [ ] I have commented my code where relevant, particularly in hard-to-understand areas

### `dev` -> `master`
- [ ] I have checked that all beta deployments have synced
- [ ] I have checked that the earliest block in the polygon pruned deployment is <insert block number>, <insert block date/time>
  - [ ] The earliest block is more than 24 hours old
- [ ] I have checked that core metrics are the same in the beta and production deployments

### Merges to `dev`
- [ ] I have checked that the graft base is not a pruned deployment
