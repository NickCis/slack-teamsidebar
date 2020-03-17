# Slack Teamsidebar

This plugin enables the _Team Sidebar_ of the Desktop application in the web version of Slack.


## Explanation

By Debugging the Desktop application (electron app) it seemed that it was loading the same bundles than the web version.
Js files were loaded from the same path and had the same hashes, so it seemed that it was possible to have the Team Sidebar on the web.

I've stated just inspecting the web, on the html there was a script tag that defined an `isDesktop` function:

```js
function isDesktop(){return/(Slack)/g.test(navigator.userAgent)}
```

So, as a first attemp was [changing Chrome user agent](https://developers.google.com/web/tools/chrome-devtools/device-mode/override-user-agent) to the Slack's app:

```
Mozilla/5.0 (X11; Linux x86_64; Arch Linux unversioned; GNOME) AppleWebKit/537.36 (KHTML, like Gecko) Slack/4.3.2 Chrome/78.0.3904.130 Electron/7.1.9 Safari/537.36 Sonic Slack_SSB/4.3.2
```

This made slack's loading placeholder to have the Team Sidebar, but, it removed it as soon as slack loaded. I'll have to do a deep debugging.

_As a side note, this ended up being harder that I've thought, if I tried to add breakpoints on the formatted slack bundle, my browser hanged. It seems that
my computer isn't fast enough to debug a 1.9mb bundle. Luckily, I ended up discovering a Chrome feature called [local overrides](https://developers.google.com/web/updates/2018/01/devtools#overrides).
That feature in addition with the [Mod Header Plugin](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj) to set the `Content Security Policy` header, allowed me to debug
the web bundle._

In order to understand how the bar was placed, I've searched all js files with the css class desktop used: `p-client--show-team-sidebar`.

This lead me to understand that there was a `Client` component that decided if it placed the team sidebar:

```js
render() {
    var {numTeams: e, teamId: t, teamStore: a, useIATopNav: n} = this.props
      , r = Object(g.getClientStoreInstance)()
      , s = Object(P.a)({
        numTeams: e
    }),
    o = s ? i.a.createElement(f.Provider, {
        store: r
    }, i.a.createElement(z.a, {
        className: "p-client__team_sidebar",
        selectedTeamId: t
    })) : null
      , c = b()("p-client", {
        "p-client--show-team-sidebar": s,
        "p-client--ia-top-nav": n,
        "p-client--custom-titlebar": this.props.isCustomTitlebarShown
    })
      , l = n && i.a.createElement(y.b, {
        subtype: "top_nav"
    }, i.a.createElement(B.a, {
        teamId: this.props.teamId
    }), i.a.createElement(q.a, null), k.bb && i.a.createElement(H.a, null))
      , d = n && i.a.createElement(G.a, null);
    return i.a.createElement(i.a.Fragment, null, i.a.createElement(T.a, null), i.a.createElement(w.a, {
        isScreenReaderEnabled: this.props.isScreenReaderEnabled
    }, i.a.createElement(f.Provider, {
        key: t,
        store: a
    }, i.a.createElement(D.a, null, i.a.createElement(I.a, {
        store: a
    }, i.a.createElement(F.a, null, i.a.createElement("div", {
        className: c
    }, i.a.createElement(y.b, null, l, i.a.createElement(y.b, {
        subtype: "team_sidebar"
    }, o), i.a.createElement(y.b, null, this.renderMainContent()), d))))))))
}
```

_Please have in mind that the code is has been formatted, but is taken from the ugliffyed bundle_.

And the `P.a` object was created by the following code:

```js
function(e, t, a) {
    "use strict";
    a.d(t, "a", function() {
        return o
    });
    var n = a("g5qt")
      , r = a("rWF5")
      , s = a("Smdl")
      , i = a("KXvl")
      , o = e=>{
        var {numTeams: t} = e;
        return Object(s.a)() && t > 1 && (!Object(r.v)() || !!Object(n.zb)()) && Object(i.b)()
    }
}
```

As far as I've understand :
- `Object(s.a)()`: always returned true
- `t > 1`: Checks that you are in more than one workspace
- `Object(r.v)()`: Checks that the user agent doesn't have the `Slack` string
- `Object(n.zb)())`: Checks that `window.desktop.teams.isTeamSidebarHidden()` returns `true` (In desktop it is the function: `() => !0`)
- `Object(i.b)()`:
   - Returns false if `!(document.documentElement.dataset.app === 'client')`
   - Returns true if `multi_team` url param (taken from `location.search`) is `true` or `1`, returns false if it's `false` or `0`
   - if `multiTeamOverride` on Local / Session Storage `localConfig_v2` is present, it will return its boolean value
   - Returns true if `(/(Slack)/g.test(window.navigator.userAgent) && (userAgent version > "4.2.0" || /\b(Sonic|SlackSonic|SlackPilot)\b/.test(navigator.navigator.userAgent))`
   - `/\bCrOS\b/.test(navigator.userAgent)`

So in order to show the Team sidebar, we can do one of these things:

- we can add `multi_team=1` to the url
- Add the property `multiTeamOverride` with the value `true` to the object (in localstorage) whose key is `localConfig_v2`.
- Add the string `CrOS` to `navigator.userAgent`.

This plugin does the last one:

```js
Object.defineProperty(Navigator.prototype, 'userAgent', {
  value: `${navigator.userAgent} CrOS`,
  configurable: false,
  enumerable: true,
  writable: false
});
```

### Debugging Desktop Slack

- [Slack for linux](https://slack.com/intl/es-ar/downloads/linux)
- [Extract deb file](https://www.cyberciti.biz/faq/how-to-extract-a-deb-file-without-opening-it-on-debian-or-ubuntu-linux/)
- [Application Packaging](https://www.electronjs.org/docs/tutorial/application-packaging)
- [How to unpack an asar file](https://stackoverflow.com/questions/38523617/how-to-unpack-an-asar-file)
- [How can I open chrome dev tool after build?](https://github.com/SimulatedGREG/electron-vue/issues/214)


```sh
wget 'https://downloads.slack-edge.com/linux_releases/slack-desktop-4.3.2-amd64.deb'
ar vx slack-desktop-4.3.2-amd64.deb
tar xf data.tar.xz
```

Here you'll find the file `./usr/lib/slack/resources/app.asar`, that's the one which contains the electron code.
We'll edit that file in order to open Chrome developer tools.

```sh
cd usr/lib/slack/resources
npx asar extract app.asar extracted
```

Now we'll add the following snipet in `extracted/dist/main.bundle.js` to open Dev tools at app startup:

```js
var electron = require('electron');
setTimeout(function () {
  electron.BrowserWindow.getFocusedWindow().webContents.openDevTools();
}, 10000);
```

(Just add the code at the top of the file)

Stading on the `./usr/lib/slack/resources` folder (of the extracted deb package), we will repackage the asar file:
(this will override original `app.asar`)

```sh
npx asar pack extracted app.asar
```

Now we can run the app, return to the first folder (where we've extracted the deb file):

```sh
./usr/bin/slack
```

(it will open the developer tools after 10 secs)
