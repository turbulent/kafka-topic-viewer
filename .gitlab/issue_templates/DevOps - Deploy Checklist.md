Devops for Platform-x.x.x.x

## Prep Checklist
- [ ] Alert the channel that a build is starting: "Build starting, check all your issues and merge requests for this deploy are labelled and have the correct milestone: Link"
- [ ] Check each gitlab diff and merge into master
- [ ] Pull master to your local
- [ ] Open each issue with migrations and move the code into the milestone header
- [ ] Send a link to the coder who wrote the migration and ask them to check that the SQL is correct and that latest migration was tested on the UAT
- [ ] Open each issue with dependencies and merge into their respective stable branches
- [ ] Check the current tag is expected for the milestone
- [ ] Start a new CHANGELOG entry for the milestone
- [ ] Edit the ```centrifuge.project.version``` to match what the new tag will be
- [ ] Pull down the latest stable and run a diff between your master and stable
- [ ] Run full test suite
- [ ] While reading through the diff the first time note the things you see in the changelog
- [ ] Check what was in the diff against what is in the gitlab milestone. Ensure everything in the gitlab milestone is in the diff.
- [ ] Do a second pass of the diff looking for anything that could break the site
- [ ] Build the assets ```substance run build```
- [ ] Check changes to see if the assets committed anything  the assets ```substance run build```
- [ ] Add files to git and ```git commit -m "Build and increment version to X.X.X```
- [ ] Checkout stable and merge master into it
- [ ] Check that the diff between master and stable is just in make.conf
- [ ] Check that the branches are correct for stable
- [ ] Run ```git tag x.x.x```
- [ ] Push the branch and tags
- [ ] Paste the contents of the CHANGELOG in slack
- [ ] Check for hidden surprises by running ```git diff x.x.1 x.x.2``` between this and the last version

## Deploy Checklist
- [ ] Ask a colleague to load any MySQL migrations into a database tool, they will run them for you. If the migrations don't need the code to be deployed run them immediately.
- [ ] Check the connectivity to the deployment servers ```salt -C 'p-prod* and G@roles:rsi-app-server' test.ping```
- [ ] Write out any deployment scripts and test on QA: https://gitlab.turbulent.ca/cig/rsi-website/milestones/25#salts
- [ ] If the deploy is complex and will cause downtime put all scripts in order for the deploy so you can just copy and paste them into your CLI
- [ ] Open error monitoring system (telemetry) and check the state of the errors
- [ ] Test the build script ```salt -C 'p-prod* and G@roles:rsi-app-server' state.sls cig-rsi.website.build test=true``` then run
- [ ] Check the home page loads
- [ ] Restart the workers container
- [ ] Restart the redis queues
- [ ] Restart the spectrum worker
- [ ] Check telemetry for errors
- [ ] If errors show up quickly paste errors into issues and assign to likely programmers. Paste issues into the channel.
