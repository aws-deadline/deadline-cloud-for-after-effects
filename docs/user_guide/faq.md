# Frequently Asked Questions

## Rendering Questions

**Q: Can I run custom ExtendScript (.jsx) scripts on Deadline Cloud workers?**

A: Yes, with limitations. The After Effects conda package on Service Managed Fleets packages the renderer and its dependencies, not a full After Effects installation. You can run custom `.jsx` scripts on workers using host configurations. However, scripts that make networking calls will not work on workers, because the "Allow Scripts To Write Files And Access Network" preference is a local user setting that cannot be configured without a full installation.

## Troubleshooting

**Q: My After Effects job is timing out or I'm seeing PermissionDenied errors during session cleanup. What's going on?**

A: This is typically caused by After Effects hanging due to a UI dialog (e.g., `alert()`, `confirm()`) that cannot be dismissed in headless mode. The symptoms are:
- **Timeout errors:** The process hangs waiting for user interaction that will never come, resulting in a `subprocess.TimeoutExpired` error.
- **PermissionDenied errors during session cleanup:** The hung After Effects process holds locks on Adobe DLLs (`AdobeXMP.dll`, `dvacore.dll`, `dynamiclink.dll`, etc.). When the worker attempts session cleanup, it produces `Access to the path '<file>' is denied` errors.

Fixing the root cause (the hung process) resolves both the timeout and the cleanup errors. Remove all UI calls from scripts intended for farm execution.

**Troubleshooting tip:** Try running the same workflow on a Windows workstation with the After Effects UI to eliminate any non-Deadline-specific issues.

**Q: I'm getting "aerender Error: Could not read from source" when my job runs. What's wrong?**

A: This error typically means the output path was not set in your composition's render queue before submitting the job. The After Effects submitter requires that you add your composition to the render queue and set up your render settings, output module, and output path before submission. See [Using the After Effects Submitter](using-submitter.md) for the full submission workflow.

**Q: My job fails at "Install Fonts to Worker" with `AddFontResource failed to load`. What do I do?**

A: Some fonts are not installable on certain operating systems due to OS-specific limitations. When the font manager attempts to install an unsupported font on a worker, it fails with an error like:
```
OSError: AddFontResource failed to load "...\tempFonts\HelveticaNeue-CondensedBlack.ttc"
```

To resolve this:
1. Check whether the font is actually used in your composition — it may have been uploaded by mistake.
2. If it is not needed, remove it from the job attachments in the submitter before resubmitting.
3. If it is needed, try substituting a different font that is compatible with Windows (Deadline Cloud only runs After Effects on Windows workers).
4. As a workaround, you can convert text layers to shapes in After Effects using [Create Shapes from Text](https://helpx.adobe.com/after-effects/using/creating-shapes-masks.html), which removes the font dependency entirely. Note that this is a one-way conversion — you will no longer be able to edit the text or use text-specific features.
5. If none of the above options work, [create an issue](https://github.com/aws-deadline/deadline-cloud-for-after-effects/issues) and we will look into it and prioritize as needed.

**Tip:** You can check if a font is installable on Windows by double-clicking the font file on a Windows machine. If it opens and shows an "Install" option, the font is supported.
