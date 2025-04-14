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


