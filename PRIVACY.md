# Privacy Policy — Context Saver

**Last updated:** April 12, 2026

## Summary

Context Saver does not collect, transmit, or store any personal data. Everything stays on your machine.

## Data handling

- **No data leaves your browser.** Context Saver runs entirely locally. It does not make any network requests, connect to any servers, or send data anywhere.
- **No analytics or telemetry.** We do not track usage, page visits, or any user behavior.
- **No accounts or sign-in.** The extension does not require or support any form of authentication.
- **Local storage only.** The only data stored is your default folder prefix setting (saved in Chrome's local storage API). This never leaves your device.

## What the extension accesses

When you click the extension icon and press "Save":

1. It reads the DOM content of the **current active tab only** to extract conversation text or article content.
2. It saves a Markdown file to your local Chrome download directory, inside the folder prefix you choose in the popup.

The extension does **not** access any other tabs, browsing history, bookmarks, passwords, or cookies.

## Permissions explained

| Permission | Why |
|---|---|
| `activeTab` | Read the current page when you click the extension icon |
| `scripting` | Inject content extraction scripts into the page |
| `downloads` | Save the Markdown file into Chrome's configured download directory |
| `storage` | Remember your folder prefix setting |

## Third parties

Context Saver does not integrate with, send data to, or receive data from any third-party services.

## Open source

The full source code is available at [github.com/bitzuist12/context-saver](https://github.com/bitzuist12/context-saver). You can verify every claim in this policy by reading the code.

## Contact

For questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/bitzuist12/context-saver/issues).
