# Frequently Asked Questions

## Rendering Questions

**Q: Can I run custom ExtendScript (.jsx) scripts on Deadline Cloud workers?**

A: Yes. The After Effects conda package on Service Managed Fleets includes the full After Effects application, not a stripped-down version. You can run custom `.jsx` scripts on workers.

Common pitfalls when running scripts on workers:
- **UI dialogs cause timeouts:** Scripts that call `alert()`, `confirm()`, or other UI functions will hang indefinitely in headless mode since there is no display to interact with. This results in a `subprocess.TimeoutExpired` error. Remove all UI calls from scripts intended for farm execution.
- **PermissionDenied errors during session cleanup:** If After Effects hangs (e.g., due to a UI dialog), the process may still hold locks on Adobe DLLs (`AdobeXMP.dll`, `dvacore.dll`, `dynamiclink.dll`, etc.) when the worker attempts session cleanup. This produces `Access to the path '<file>' is denied` errors. The root cause is the hung After Effects process — fixing the script to avoid UI calls resolves both the timeout and the cleanup errors.
- **Finding the executable:** On SMF workers with conda enabled, After Effects executables are located under the conda `$PREFIX/aftereffects` folder.

For more details on how After Effects is packaged for conda, see the [sample conda recipe](https://github.com/aws-deadline/deadline-cloud-samples/tree/mainline/conda_recipes/aftereffects-25.1).

**Troubleshooting tip:** If your script fails on a worker, try running the same script on a Windows workstation with the After Effects UI to eliminate any non-Deadline-specific issues.

## Troubleshooting

**Q: I'm getting "aerender Error: Could not read from source" when my job runs. What's wrong?**

A: This error typically means the output path was not set in your composition's render queue before submitting the job. The After Effects submitter requires that you add your composition to the render queue and set up your render settings, output module, and output path before submission. See [Using the After Effects Submitter](using-submitter.md) for the full submission workflow.

**Q: My job fails at "Install Fonts to Worker" with `AddFontResource failed to load` on a `.ttc` font. What do I do?**

A: Not all TrueTypeCollection (`.ttc`) fonts are installable on Windows. When the font manager attempts to install an unsupported `.ttc` font on a worker, it fails with an error like:
```
OSError: AddFontResource failed to load "...\tempFonts\HelveticaNeue-CondensedBlack.ttc"
```

To resolve this:
1. Check whether the font is actually used in your composition — it may have been uploaded by mistake.
2. If it is not needed, remove it from the job attachments in the submitter before resubmitting.
3. If it is needed, try substituting a different font that is compatible with Windows.
4. If neither option works, [create an issue](https://github.com/aws-deadline/deadline-cloud-for-after-effects/issues) and we will look into it and prioritize as needed.

**Tip:** You can check if a `.ttc` font is installable on Windows by double-clicking the font file on a Windows machine. If it opens and shows an "Install" option, the font is supported.
