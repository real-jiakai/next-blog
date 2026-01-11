# [5.0.0](https://github.com/simple-is-awesome/simple/compare/v4.0.0...v5.0.0) (2025-01-10)

### BREAKING CHANGES

* **Architecture Migration**: Migrated from Pages Router to App Router with native i18n
* **TypeScript**: Converted entire codebase from JavaScript to TypeScript
* **Next.js 16**: Upgraded to Next.js 16 with Turbopack support
* **React 19**: Upgraded to React 19.2.1

### Features

* Native internationalization with middleware-based locale detection
* Dynamic sitemap and robots.txt generation using Next.js built-in metadata
* VitePress-style hover language dropdown
* Improved layout consistency across all pages (max-w-5xl)
* Sticky footer pagination for article lists

### Removed

* AI Summary feature (Gemini/DeepSeek integration)
* next-translate dependency (replaced with native i18n)
* next-sitemap dependency (replaced with built-in sitemap)
* Husky (replaced with simple-git-hooks)
* openai dependency

### Technical Improvements

* Simplified pre-commit hooks with simple-git-hooks
* Cleaner project structure with unused code removed
* React best practices (removed unnecessary useState in useEffect)
* Tailwind CSS v4 with modern configuration

---

# [4.0.0](https://github.com/simple-is-awesome/simple/compare/v3.0.1...v4.0.0) (2023-04-22)


* :pencil: Finish the README ([4aceeaf](https://github.com/simple-is-awesome/simple/commit/4aceeaf587a7798d02790bf743fe5ba96bb649e1))


### BREAKING CHANGES

* English and Chinese README finished && Docker Compose deployment finished && All blog features finished.

## [3.0.1](https://github.com/simple-is-awesome/simple/compare/v3.0.0...v3.0.1) (2023-04-18)


### Bug Fixes

* :bug: fix navbar responsive layout && add i18n support ([0e31be0](https://github.com/simple-is-awesome/simple/commit/0e31be00736044cc453122dd0244cf7f712541d2))

# [3.0.0](https://github.com/simple-is-awesome/simple/compare/v2.0.0...v3.0.0) (2023-04-01)


* :sparkles: add supabase comment support ([44f1bb5](https://github.com/simple-is-awesome/simple/commit/44f1bb59477314f1a06402893acce0d689ab5d52))


### BREAKING CHANGES

* Supabase integrates with Next.js

# [2.0.0](https://github.com/simple-is-awesome/simple/compare/v1.0.0...v2.0.0) (2023-03-30)


* :bug: install @semantic-release/git -D ([e8e064f](https://github.com/simple-is-awesome/simple/commit/e8e064f92feb9af204bd6b062b8357ad7e836e52))
* :sparkles: update .releaserc ([ad29394](https://github.com/simple-is-awesome/simple/commit/ad29394e50d92081dfbec5e743e9a12e34c6fbcb))


### BREAKING CHANGES

* Install @semantic-release/git -D
* Update .releaserc
