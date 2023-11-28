# COB Workflow

## Install

`cob-cli customize worflow`

## Setup:

### IntegrationM
* Add new rest action pack for integrationm

```properties
action.name=...,imRest

action.imRest=rest
action.imRest.base-url=http://localhost:40380
action.imRest.cookie-name=cobtoken
action.imRest.cookie-value=<intemporal token for integrationm user>
```

### UserM

* Add new user `cob-bot` with `system` privileges

### RecordM

* Import all definitions.
