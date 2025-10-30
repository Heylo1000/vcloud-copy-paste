# vcloud-copy-paste

Allows pasting in vCloud web console by injecting keystrokes.

This probably only works with the en-us keyboard layout

Helper userscript for Humber fast-vCloud to send text into the VM canvas (#mainCanvas) with delay, history, and optional sticky footer.

> **Note**  
> To use this script you must install it in a userscript manager such as **Tampermonkey** (recommended).

---

## Installation (Tampermonkey)

1. **Install Tampermonkey** in your browser:
   - Chrome / Edge / Brave: go to the web store and search for **Tampermonkey**
   - Firefox: add-on store → **Tampermonkey**
2. Open this file in GitHub and click **Raw**.
3. Your browser / Tampermonkey should prompt **“Install userscript?”** → click **Install**.
4. Make sure the script is **enabled** in Tampermonkey.
5. Visit **https://fast-vcloud.humber.ca/** and open the VM console.  
   You should see the **vCloud Copy/Paste** panel appear (usually at the bottom if sticky is on).

---

## Updating

- Pull the latest version or open the new `.user.js` in GitHub → **Raw** → Tampermonkey will offer to **update**.
- If you forked this repo, point Tampermonkey to **your** raw URL.

---

## Notes

- This script targets `https://fast-vcloud.humber.ca/*` by default.  
  If your vCloud is on a different host, edit the `@match` line in the userscript header.
- Works best when the VM canvas element is called `#mainCanvas` (the script dispatches key events to that element).

---

## Other userscript managers

Tampermonkey is recommended. Violentmonkey / Greasemonkey may work, but not all features (like clipboard or UI styling) are guaranteed.


https://github.com/user-attachments/assets/95a2c288-b89c-4a7f-a1f3-ed25b157d64c

