# AWS Deadline Cloud for After Effects - Test Assets
This directory contains an After Effects project with multiple compositions that you can use to test the functionality of the submitter and renderer.

## Composition overview

### AWS Deadline Cloud _ Amazon Web Services
Contains multiple footage sources.

### Nested_Comp
Has another comp as one of its layers. This can be used to check if recursive footage gathering works with the submitted comp, i.e. if all references in a subcomp are collected correctly.

### Logo
An animated logo used as an asset in the nested comp.

### RSMB_Motion_Blur
Uses the [RSMB](https://revisionfx.com/products/rsmb/after-effects/) motion blur effect. This comp can be used to test including plugins in the job.

### Font_Support
Includes two custom fonts:
- An [Adobe font](https://fonts.adobe.com/fonts/cy-text)
- A [custom font](https://fonts.google.com/specimen/Slabo+13px) that must be installed from the Font folder onto your machine before you load and submit the comp.

This comp can be used to test rendering custom fonts on your farm.
