# Prepare account 843447460827 for FuseMvp (us-east-1)

`fuse-dev` cannot bootstrap CDK or attach IAM. An **administrator** profile must run the commands below. Do not attach `AdministratorAccess` or `IAMFullAccess` to `fuse-dev`. Do not allow `bedrock:InvokeModel`.

Replace `<admin-profile>` with a privileged profile.

```powershell
aws sts get-caller-identity --profile <admin-profile>

aws iam create-policy --profile <admin-profile> --policy-name FuseDevCdkDeploy --policy-document file://infra/iam/fuse-dev-cdk-deploy.json
aws iam attach-user-policy --profile <admin-profile> --user-name fuse-dev --policy-arn arn:aws:iam::843447460827:policy/FuseDevCdkDeploy

cd infra
pnpm exec cdk bootstrap aws://843447460827/us-east-1 --profile <admin-profile>
```

If the policy already exists, create a new version instead of `create-policy`.

Then verify and deploy:

```powershell
aws sts get-caller-identity --profile fuse-dev
pnpm aws:deploy
```
