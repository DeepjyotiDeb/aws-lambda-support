NOTE - deploy command from package.json works on macos and linux only fails change this line

"cdk:deploy:dev": "npm run build && npm run cdk -- deploy $(npm run --silent cdk:name)-Dev",
to
"cdk:deploy:dev": "npm run build && npm run cdk -- deploy YOUR_APP_NAME-Dev",
for windows deployment

requirements - account in aws, aws cdk cli
install cdk using `npm i -g aws-cdk`
first time deployment requires bootstrapping
cd into infrastucture folder and run
`npx cdk bootstrap`

for deployment
npm run cdk:deploy:{stage}
example - `npm run cdk:deploy:dev`

to destroy
npm run cdk:destroy:dev