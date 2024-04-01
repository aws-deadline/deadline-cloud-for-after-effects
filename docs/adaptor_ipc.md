# OpenJD Adaptor Client IPC layer

The adaptor requires an IPC layer between openjd-adaptor-runtime and the 
client running inside of After Effects.

The source of the IPC layer is located in `src/aeipc`. This is bundled into the adaptor
at `src/deadline/ae_adaptor/clientipc/ipc.jsx`.

Any changes to `src/aeipc` can be rebundled into the adaptor using the `jsxbundler.py` script as follows:

```
python jsxbundler.py --source src/aeipc/ipc.jsx --destination src/deadline/ae_adaptor/clientipc/ipc.jsx
```