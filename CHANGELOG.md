## 0.5.0 (2026-08-25)

### BREAKING CHANGES
* Render options (frames per task, multi-frame rendering, max CPU usage, ignore missing dependencies) are now set once per job instead of per composition. This raises the maximum compositions per job from 5 to 15. If you relied on per-composition render settings, you will now need to submit separate jobs for compositions requiring different render options. (#322)

### Features
* Task progress and failure status now surface in Deadline Cloud Monitor via OpenJD progress reporting. Progress is count-based (distinct frames rendered / frames owned) and works regardless of aerender's frame-numbering mode. (#327)
* When a queue environment sets the DEADLINE_JUNCTIONS environment variable pointing to a pathmapping-1.0 file, project and output paths are automatically rerouted through Windows junctions to stay under the 260-character path limit. (#324)
* The submitter UI now shows vertical scrollbars automatically when part of the window content is cut off. (#290)
## 0.4.5 (2026-03-10)


### Features
* add AE 2026 support to installer and submitter (#291) ([`276826d`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/276826d724eefcf227cbf2e4067c556c94e06a45))

### Bug Fixes
* fix the broken link (#288) ([`755c504`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/755c5041bc2b5783669203712269e4cb15e646b0))
* add project displayStartFrame to frame range calculation (#283) ([`324318b`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/324318b7b37e8592b841c86d6cc4f58605700863))
* add project displayStartFrame to frame range calculation ([`324318b`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/324318b7b37e8592b841c86d6cc4f58605700863))


## 0.4.4 (2025-12-08)


### Features
* Script based ae submitter installation for macOS to user preferences directory (#271) ([`e61c6a6`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/e61c6a68dd3a0c34fa9bac814c2f4325b7b98cab))
* Support ttc font type in job submission and rendering (#273) ([`1f55eda`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/1f55edaf108e5f7c6775b29855264910fd4e39e3))



## 0.4.3 (2025-10-21)


### Features
* Ignore Missing Dependencies (#212) ([`844fd24`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/844fd248a4f4c2a548bcd7cb55f1da6d378a1cd4))

### Bug Fixes
* fix fallback script regex to only strip leading and trailing whitespace instead of all whitespace (#261) ([`bc8787b`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/bc8787b0704b49d9dd20b38be820b15407fcbca2))
* improve get_user_fonts.py script and refactored file existence validation to minimize popups (#260) ([`01c66a9`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/01c66a99025b870bf94b1f844ab5a1cb59dc119e))
* bug fix for valid fonts not being collected (#259) ([`3623190`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/36231906a3b457a31ba42f7157b70ab8c990fe4e))
* aggregate font errors into single popup for submission (#257) ([`3f91674`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/3f91674345626a4385606c2273ea27f40cc804fe))
* sanitize parameter names to comply with open-jd specification (#254) ([`cfb6a4a`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/cfb6a4a62b01c674692a18953a1e6ab2a635035d))
* update generatePrettyName as well to be consistent to replace special characters ([`cfb6a4a`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/cfb6a4a62b01c674692a18953a1e6ab2a635035d))
* moved font search logic to get_user_fonts.py to permanently prevent JSON size overflow issues that crashes After Effects (#252) ([`a259316`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/a25931609b8630fdcc355a2c531f36f95cb149d6))
* Only the first frame from an image sequence gets included in Job Attachments (#214) ([`646e1e5`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/646e1e55c72f38c076f5f7ba63ee4ba9932cb4c4))

## 0.4.2 (2025-08-20)



### Bug Fixes
* fix regression of repeated popups due to unsupported AE version (#239) ([`480e904`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/480e9041811a528ff2f6a145838a3d5387d026a5))

## 0.4.1 (2025-08-19)



### Bug Fixes
* resolves issue in saveStringMetadata function (#237) ([`a5581a7`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/a5581a79bc474bf1b988b4fcb4a8bb69673c6d28))

## 0.4.0 (2025-08-13)


### Features
* Support multiple composition submissions in one job (#207) ([`1e31f89`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/1e31f895d48bead8ae9577c4ef7cf12e8e299643))

### Bug Fixes
* resolve security risk with regex (#235) ([`16a3420`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/16a3420ca80823bcfcfe78311acff07101350835))

## 0.3.1 (2025-07-29)



### Bug Fixes
* update start and end frame to reflect frame numbers accurately (#228) ([`329b5b1`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/329b5b1633fff34e266d84dc27eaa31d39907ee5))

## 0.3.0 (2025-07-15)


### Features
* add timeout checkbox for customers to set a timeout number for openjd (#224) ([`307809c`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/307809cdc1393b5334c5e57fd81ee6e43a84ebe1))

### Bug Fixes
* change the error handling for aerender cmd to fail the task when the aerender Error gets thrown (#223) ([`2d06a57`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/2d06a57191595d94160de98fe0a425c1ffd2aed7))

## 0.2.7 (2025-07-08)



### Bug Fixes
* added missing build changes to DeadlineCloudSubmitter.jsx (#220) ([`5843506`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/5843506890e04af3a2f8d62a6f45f50a5e0c11a8))
* refactor SUPPORTED_VERSIONS const declaration and add ignore warning functionality for version mismatch (#216) ([`1606c82`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/1606c82f5773e63dc668a30a223efe735b684775))

## 0.2.6 (2025-06-24)



### Bug Fixes
* including setting minor version for CondaPackages field and added version mismatch warnings (#204) ([`17dfb3e`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/17dfb3e80a0ab518d4227b96f91f82f739fd34bd))

## 0.2.5 (2025-06-04)



### Bug Fixes
* repaired getTempFolder() function logic (#197) ([`20aab04`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/20aab047a3aab19bf59c159b826388ab189f9677))

## 0.2.4 (2025-05-27)


### Features
* New Utils function to check temp folder perms before writing temp files (#192) ([`15fcf81`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/15fcf8156595c047f633380dc23be3f0939f2503))


## 0.2.3 (2025-05-09)


### Features
* add support for After Effects submitter user install on Mac & Windows (#187) ([`2b25671`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/2b2567144e17b2574fe3fbf8cedcce185e453a6c))


## 0.2.2 (2025-04-14)



### Features
* added macOS installer support for After Effects with updated unit tests (#154) ([`b131151`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/b131151b2fc8e2547a9a634caa57a9235de3273a))
* adding support to use multi-frame rendering and improving submitter settings input behavior (#148) ([`2ef8f77`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/2ef8f77cce3ad9c4e99160a279927a518a4981bd))
* disable "Frames Per Task" textbox if selected composition is not an image sequence (#131) ([`a64fa2f`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/a64fa2fb68afad31bfded1546d4ec390da0e95fb))

### Bug Fixes
* added Python validation check on job submission (#162) ([`76e3e4f`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/76e3e4fb73b96138bf677328d0c9d39387447420))
* revert switching Deadline CLI from Terminal window call to shell script call to avoid Terminal window popup on Mac (#161) ([`e70ea64`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/e70ea64f837ad6986b0030a27acba69ff91e48d1))
* switch Deadline CLI from Terminal window call to shell script call to avoid Terminal window popup on Mac (#159) ([`7e47520`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/7e475201beee0150e1bfb90bb801b96cddfebd4f))
* fixed pipeline installer script to call correct hatch command (#155) ([`658cc9c`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/658cc9c01ea19c8c41ce3ea5ae5d540fb149f21b))
* defined default height and width of submitter panel (#146) ([`5bd8c8d`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/5bd8c8d6ee23a8e2af570ed70e1b78a4fcb490b8))
* in macOS make GUI submitter independent on AE submitter to allow end users to keep using AE during assets upload (#139) ([`d2d425e`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/d2d425e8d37b76b6d7382869ef347e7f40113f56))
* add submitter-name After Effects to auto-close GUI submitter after submission (#138) ([`cb3e9dc`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/cb3e9dc3ddfa21510e8e20d9b77bb4f810ffa555))
* fixed getPythonExecutable() function for submitter on MacOS  (#128) ([`7220c72`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/7220c7237bf2e4edbbb29a30f0541b568b055010))


## 0.2.1 (2025-02-04)



### Bug Fixes
* better error handling for deadline cli call (#126) ([`5049e69`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/5049e69d3cf368ffc0486a7bf59894ecca4db8a4))

## 0.2.0 (2025-02-03)


### BREAKING CHANGES
* new dockable AE submitter with custom font and image sequence chunking (#106) ([`a0dbcb2`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/a0dbcb2008a40e9ac9de6de5285996e3df0f8f50))

### Bug Fixes
* added UTF-8 file encoding support on all files written to or read from (#116) ([`fd751d4`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/fd751d45b379a12d45d5b28f51705c42c5b9b725))

## 0.1.2 (2024-05-22)



### Bug Fixes
* move ae_adaptor and ae_submitter into deadline namespace package, and fix \P invalid syntax in jsxbundler on windows (#32) ([`6c01fc9`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/6c01fc9ce5f4ce8143557a4652e12c233357e61c))

## 0.1.1 (2024-05-01)

### Dependencies
* Update deadline requirement from ==0.47.* to ==0.48.* (#25) ([`7a63cde`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/7a63cde8a85568cbd0338eb86bd3e52cd994807c))


## 0.1.0 (2024-04-02)

### BREAKING CHANGES
* public release (#14) ([`d60ace8`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/d60ace8b93945c259fd9843b3c50e73f41e65704))



## 0.0.2 (2024-03-26)


### CI
* updating patch version to resolve a build failure


## 0.0.1 (2024-03-26)


### Features
* initial integration (#1) ([`4f9b21c`](https://github.com/aws-deadline/deadline-cloud-for-after-effects/commit/4f9b21c1984b573787378e7ab462c6c93120f219))


