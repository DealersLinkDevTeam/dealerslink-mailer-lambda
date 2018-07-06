# dealerslink-mailer-lambda

An SQS mail delivery processor and worker for AWS Lambda, which processes the email messages and delivers them using sendgrid.

# Table of Contents
  1. [Documentation](#documentation)
      1. [Configuration](#config)
  2. [Appendix](#appendix)
      1. [Debugging](#debugging)

<a name="documentation"></a>
# Documentation
When developing in Lambda-NodeJS8.10 it is important to be mindful of [language support](https://node.green/) for NodeJS 8.10

## Configuration
Built in scripts are provided to aid with provisioning of the services. To configure the environment perform the following:

1. If it is not already, install the [AWS CLI](https://aws.amazon.com/cli/) on the staging environment (MacOS/Linux only).
2. Clone the git repo:
```shell
$ git clone https://github.com/DealersLinkDevTeam/dealerslink-mailer-lambda.git
$ cd dealerslink-mailer-lambda
```
3. Run the base configurator*:
```shell
$ npm run config
```
4. Run the AWS configurator:
```shell
$ npm run aws-config
```
5. Run the Setup:
```shell
$ npm run setup
```

To revert the configuration to defaults perform the following:

1. Run the AWS deconfigurator:
```shell
$ npm run aws-deconfig
```
2. Run the deconfigurator:
```shell
$ npm run deconfig
```

<a name="appendix"></a>
# Appendix

<a name="debugging"></a>
## Local Debugging
Debugging uses Docker, [docker-lambda](https://github.com/lambci/docker-lambda), and (AWS SAM)[https://github.com/awslabs/aws-sam-local]

1. Ensure that [Docker](https://www.docker.com/), [AWS SAM](https://github.com/awslabs/aws-sam-local), and the [AWS CLI](https://aws.amazon.com/cli) are installed locally.
2. Docker will need to be started and running.
3. You will need to run the AWS Package command to bundle your CloudFormation package.
4. Run the SAM command as follows per your scenario:

**Invoke Lambda Function**
```
$ sam local invoke -t <template-package.yml>
```

**Run API Gateway / Lambda**
```
$ sam local start-api -t <template-package.yml>
```
