## [1.0.4](https://github.com/real-jiakai/next-blog/compare/v1.0.3...v1.0.4) (2026-07-12)


### Bug Fixes

* **ui:** polish mobile posts and Turnstile ([7cdf16e](https://github.com/real-jiakai/next-blog/commit/7cdf16e49d72a548c586dc7b413ffac1b46a30df))

## [1.0.3](https://github.com/real-jiakai/next-blog/compare/v1.0.2...v1.0.3) (2026-07-12)


### Bug Fixes

* refine responsive UI and production configuration ([366a7a6](https://github.com/real-jiakai/next-blog/commit/366a7a62d92e894dde7938f4337a3e8553bf15c2))

## [1.0.2](https://github.com/real-jiakai/next-blog/compare/v1.0.1...v1.0.2) (2026-07-11)


### Bug Fixes

* **deploy:** load production environment ([ec06085](https://github.com/real-jiakai/next-blog/commit/ec0608539deb208532460899345aa00451a594c6))

## [1.0.1](https://github.com/real-jiakai/next-blog/compare/v1.0.0...v1.0.1) (2026-07-11)


### Bug Fixes

* restore production comments ([e33c1f2](https://github.com/real-jiakai/next-blog/commit/e33c1f20fd65c74e31cbcf5588a90c94b0cc1416))

# 1.0.0 (2026-07-11)


* :bug: install @semantic-release/git -D ([e8e064f](https://github.com/real-jiakai/next-blog/commit/e8e064f92feb9af204bd6b062b8357ad7e836e52))
* :pencil: Finish the README ([4aceeaf](https://github.com/real-jiakai/next-blog/commit/4aceeaf587a7798d02790bf743fe5ba96bb649e1))
* :sparkles: add supabase comment support ([44f1bb5](https://github.com/real-jiakai/next-blog/commit/44f1bb59477314f1a06402893acce0d689ab5d52))
* :sparkles: update .releaserc ([ad29394](https://github.com/real-jiakai/next-blog/commit/ad29394e50d92081dfbec5e743e9a12e34c6fbcb))


### Bug Fixes

* :bug: fix navbar responsive layout && add i18n support ([0e31be0](https://github.com/real-jiakai/next-blog/commit/0e31be00736044cc453122dd0244cf7f712541d2))
* :bug: fix navbar ui bug ([56f9653](https://github.com/real-jiakai/next-blog/commit/56f9653735fb89999bae26d6eb35346d364fb605))
* :bug: fix pnpm-lock.yaml ([4f7bb35](https://github.com/real-jiakai/next-blog/commit/4f7bb35378fb652afcd4a3a0898181b37472bfdb))
* :bug: mkdir posts directory and move all md files to it ([d04012b](https://github.com/real-jiakai/next-blog/commit/d04012b864b1fdfebb21b0a732caebd1ea518bd1))
* **404:** also handle unmatched paths with the themed page ([1a0325e](https://github.com/real-jiakai/next-blog/commit/1a0325ee61a5f2eb64e22bec9c472f953c8e2033))
* **api:** harden comment endpoints against injection, PII leak, and bad input ([ea8a4f9](https://github.com/real-jiakai/next-blog/commit/ea8a4f924e086a094c45652b842e2b059baf4f63)), closes [#1](https://github.com/real-jiakai/next-blog/issues/1) [#2](https://github.com/real-jiakai/next-blog/issues/2) [#3](https://github.com/real-jiakai/next-blog/issues/3) [#4](https://github.com/real-jiakai/next-blog/issues/4)
* cap article image height at 70vh to prevent viewport overflow ([fe9367d](https://github.com/real-jiakai/next-blog/commit/fe9367dc8928ee4afeead07479bad978f083c511))
* **comment:** correct outdated label and localize comment list strings ([70d94e5](https://github.com/real-jiakai/next-blog/commit/70d94e542ab8b4687563189bb78eeb82d012b0e0))
* **comment:** log notification email results for production diagnosis ([b8dc40f](https://github.com/real-jiakai/next-blog/commit/b8dc40f1bb392670f3a1a9a65dc95e376f7bd51b))
* **comment:** send sanitized plaintext in notification emails ([2fc2625](https://github.com/real-jiakai/next-blog/commit/2fc2625ac2e9ce0fcb936e60c09105346f77c710))
* **comment:** stop SMTP from blocking and failing comment submission ([e5764b2](https://github.com/real-jiakai/next-blog/commit/e5764b24f8bb5029582a9e279200e0676d9a3501))
* **deps:** override next's bundled postcss to the patched line (GHSA-qx2v-qp2m-jg93) ([64142f3](https://github.com/real-jiakai/next-blog/commit/64142f30d21a2e5129b57d0197705c5a076b91d0))
* **deps:** override semantic-release's vulnerable undici to patched versions ([2680353](https://github.com/real-jiakai/next-blog/commit/26803533ca2adfb0739513e61919751246c857f8))
* **deps:** patch vulns, drop rehype-add-classes; local post-HTML plugin ([#5](https://github.com/real-jiakai/next-blog/issues/5),[#10](https://github.com/real-jiakai/next-blog/issues/10),[#12](https://github.com/real-jiakai/next-blog/issues/12),[#13](https://github.com/real-jiakai/next-blog/issues/13)) ([ea39d8b](https://github.com/real-jiakai/next-blog/commit/ea39d8b16a9b0a2ad4d2a1acc02524ef2b02cef7))
* effect cleanup, TOC text, dead CSS, tsconfig, URL-encoding ([#14](https://github.com/real-jiakai/next-blog/issues/14),[#15](https://github.com/real-jiakai/next-blog/issues/15),[#16](https://github.com/real-jiakai/next-blog/issues/16),[#17](https://github.com/real-jiakai/next-blog/issues/17)) ([79fdd1e](https://github.com/real-jiakai/next-blog/commit/79fdd1e56402d547680bd26ba92d940e0588acbb))
* eslint fix ([3e41d45](https://github.com/real-jiakai/next-blog/commit/3e41d45d7745d0d3ba8927630271946373d2c8ad))
* fix date ([3dad727](https://github.com/real-jiakai/next-blog/commit/3dad7279278d4125d4920fde93d1dbf1a3a96004))
* fix docker-compose.yml file ([f1604cc](https://github.com/real-jiakai/next-blog/commit/f1604ccbab110fcbff091b9f604a40f365b9ab85))
* fix mobile layout ([d5e3e88](https://github.com/real-jiakai/next-blog/commit/d5e3e88b1f3d0904b4524d88c1646742b3dda36f))
* fix pages/archive.js eslint error && fix navbar component Link tag ([2a8f560](https://github.com/real-jiakai/next-blog/commit/2a8f560ec372e35fafc98e4966e353a4e579e978))
* fix pagination style issue ([b97bdff](https://github.com/real-jiakai/next-blog/commit/b97bdffa6588f3d929fbef5c25229ae0db38599e))
* fix qwen api problem ([dba9dea](https://github.com/real-jiakai/next-blog/commit/dba9dea4cb1a996eb4d9d29054aacc00590c7be1))
* fix the mobile navbar list style && fix the search list style ([a1c30de](https://github.com/real-jiakai/next-blog/commit/a1c30deb074c6bef5fe16791828d68891dd29ee6))
* modify the gemini 2.0 flash lite name ([5cbe3e4](https://github.com/real-jiakai/next-blog/commit/5cbe3e4f2c81a8f4171dd17cea3920a41cc1689d))
* remove douban and gallery page ([acd09de](https://github.com/real-jiakai/next-blog/commit/acd09de816407de81d58ff07911f6789d77c7755))
* resolve blog audit findings ([78e9f8d](https://github.com/real-jiakai/next-blog/commit/78e9f8d51ae94a2f90bf4905fde88648b5802c97))
* **seo:** real 404s + per-post metadata/OG, fix keywords env var ([20d756b](https://github.com/real-jiakai/next-blog/commit/20d756b440daf87c45eef1d6674b0f6cd7da4405)), closes [#7](https://github.com/real-jiakai/next-blog/issues/7) [#9](https://github.com/real-jiakai/next-blog/issues/9) [#11](https://github.com/real-jiakai/next-blog/issues/11)
* Update ArticleToc, supabase.js, chatgpt.js, and ChatGPTSummary components ([6bb271f](https://github.com/real-jiakai/next-blog/commit/6bb271fb1aeafe3977c1a258556121adb9ef044c))
* Update dependencies and fix code formatting issues ([1f4c721](https://github.com/real-jiakai/next-blog/commit/1f4c721ca8601f4ad483da6040eed0f9cd820dd7))
* update Dockerfile ([b558c75](https://github.com/real-jiakai/next-blog/commit/b558c75635484e383ebab929fdebb469cc77de3d))
* update index.xml ([be66de4](https://github.com/real-jiakai/next-blog/commit/be66de424c61d096c7638cd882151aeab09afca1))
* update rss ([4ae12e7](https://github.com/real-jiakai/next-blog/commit/4ae12e726710e7fc89227bd7f4f74d30407e8bca))
* update rss feed ([fc32eea](https://github.com/real-jiakai/next-blog/commit/fc32eea922bbf3beefcac3134ccaf037f26bfbd3))
* update xml file in mac ([d819f32](https://github.com/real-jiakai/next-blog/commit/d819f325f533b730e861d37ecbae722182262142))
* use svh units for image height cap on mobile ([5f8f226](https://github.com/real-jiakai/next-blog/commit/5f8f22624d4bd11d7cd4b18512f0f5162afb5352))


### Features

* :sparkles: finish pre-render and data-fetch ([7320c3f](https://github.com/real-jiakai/next-blog/commit/7320c3f525b30cde41c6a5d340b4d7bab74d5b97))
* :sparkles: finish starter code ([ca272f7](https://github.com/real-jiakai/next-blog/commit/ca272f740c1d31c16962a13a9137999ff406527f))
* :sparkles: first commit ([35a6df5](https://github.com/real-jiakai/next-blog/commit/35a6df580d049d56ef11c49f87f4f0f6e3511e66))
* **404:** themed bilingual not-found page ([3dbd3fc](https://github.com/real-jiakai/next-blog/commit/3dbd3fc44a88c674b99cdd8acdb2bb22b5109363))
* add 500、robots.txt and sitemap ([5556812](https://github.com/real-jiakai/next-blog/commit/55568127556320841172c02e5a2660ee732b1fee))
* add a new article ([66823d3](https://github.com/real-jiakai/next-blog/commit/66823d39144ae9cd3af1729e899ea5f533b1bf6d))
* add a new article in mac ([c20b158](https://github.com/real-jiakai/next-blog/commit/c20b1584fac548dca86815fef2b418306469e1a2))
* add an archive page && add a new article && remove unused packages && remove gemini and groq ai && add gemini-40-mini and claude-3-haiku ai ([1557892](https://github.com/real-jiakai/next-blog/commit/155789279d39b79820bd196be6020a575450e92b))
* add an article && change cladue model ([8c806e5](https://github.com/real-jiakai/next-blog/commit/8c806e5cbe05ac13a03918d809a37bbb2eb3e2c9))
* add claude api support && adjust the ai summary component style to select-options ([00f0141](https://github.com/real-jiakai/next-blog/commit/00f0141874c622c463330587a9ed4fdcc6dd4395))
* add email functionality and alternative URL support for comment insertion and selection ([3e4f809](https://github.com/real-jiakai/next-blog/commit/3e4f8093a9af4bc3e61305ad635313ea87732bba))
* Add Google Generative AI package and Gemini API endpoint ([2dd644d](https://github.com/real-jiakai/next-blog/commit/2dd644d36adb9238b708bfbf6611eace9d8c8b99))
* add image lightbox with zoom and captions ([abae2e5](https://github.com/real-jiakai/next-blog/commit/abae2e50b113559dca5b2951f035cb0a94912b33))
* add llms.txt for LLM-friendly site discovery ([26ac2d5](https://github.com/real-jiakai/next-blog/commit/26ac2d5f39d0b87353da42459a522973bfa7c047))
* add mistral ai api support ([4c98a74](https://github.com/real-jiakai/next-blog/commit/4c98a7434af76a8ae549d4df0a672563e7bfe332))
* Add weekly issue [#17](https://github.com/real-jiakai/next-blog/issues/17) and update index.xml ([0a4468a](https://github.com/real-jiakai/next-blog/commit/0a4468a080d848010c6327fb489569af188431f5))
* add weekly issue [#23](https://github.com/real-jiakai/next-blog/issues/23) with English translation ([0728291](https://github.com/real-jiakai/next-blog/commit/0728291f61ef614d6a3c9660e1eafaa35d11a708))
* change gemini api version ([4e58fed](https://github.com/real-jiakai/next-blog/commit/4e58fed85b2b2c15379f34024f1c5466968bc48c))
* change lingyiwangwu to qwen turbo ([ab31fcf](https://github.com/real-jiakai/next-blog/commit/ab31fcf8b0298d30808e072e6278cfbfb565ce08))
* **comment:** add localized markdown-supported hint to form ([18f6589](https://github.com/real-jiakai/next-blog/commit/18f65894cb13ab3fdd3ddf1f694d61b6c0f3cde3))
* **comment:** add markdown+HTML sanitizing renderer ([918a83a](https://github.com/real-jiakai/next-blog/commit/918a83a21f783a89f424f35074e0edcbae2eb5d5))
* **comment:** render comments in block container for markdown ([ffb8f67](https://github.com/real-jiakai/next-blog/commit/ffb8f6786c3211b24afd3ba366d6d1e5681658cd))
* **comment:** sanitize and render comment markdown on read ([e2f7224](https://github.com/real-jiakai/next-blog/commit/e2f7224918513eb245a72022cf807fa92315bea7))
* enhance i18n support ([a1fab3b](https://github.com/real-jiakai/next-blog/commit/a1fab3b66f6224fec71a851a183eaca66a504dc4))
* fix docker compose port && add umami track code ([439eee3](https://github.com/real-jiakai/next-blog/commit/439eee3450114f1169fd2a36c8a3e58ff63a32d3))
* merge origin/main of windows update ([d4e497d](https://github.com/real-jiakai/next-blog/commit/d4e497d0562f021a765b1db842d563c45aef816b))
* merge the origin/main in windows ([66a22d1](https://github.com/real-jiakai/next-blog/commit/66a22d1056934ac2069a617ccbcc5d45c82e90f3))
* merge the windows update ([8d26598](https://github.com/real-jiakai/next-blog/commit/8d2659879f313930c0208ca7e67431f4acdd321c))
* redesign article cards with shared PostCard component ([872b11d](https://github.com/real-jiakai/next-blog/commit/872b11dae0cf5fdf9ee5eeb33fb067b95e6f0d39))
* remove doubao ai summary feature. ([209d3bc](https://github.com/real-jiakai/next-blog/commit/209d3bcb5a978fc3f529adc2c2a11ab12a7f8f0c))
* remove gallery and movie parts ([a940fc9](https://github.com/real-jiakai/next-blog/commit/a940fc950aa30289e6d4d642e9eb72141729ec62))
* **security:** add security headers incl. CSP in next.config ([#6](https://github.com/real-jiakai/next-blog/issues/6)) ([4dc9a09](https://github.com/real-jiakai/next-blog/commit/4dc9a0908147a2ffac2c7b5b818ae88e72bf9ac2))
* support emoji shortcodes in comments and posts ([30bb201](https://github.com/real-jiakai/next-blog/commit/30bb201c880a14d39479a79e24024641b5bca31e))
* **toc:** highlight the active heading while scrolling ([8d58f90](https://github.com/real-jiakai/next-blog/commit/8d58f906bcb2e4df8e1c5f850a28a56927a57332))
* update AI model and image domain ([af1aa22](https://github.com/real-jiakai/next-blog/commit/af1aa22937787441c92af30a857a7307fa698b73))
* Update dependencies and fix styling issues ([998c385](https://github.com/real-jiakai/next-blog/commit/998c3850ead9155dffadcf088854597307350c9f))
* update package ([e0a42d5](https://github.com/real-jiakai/next-blog/commit/e0a42d58812e6aceafa9cc53ac404f1a4b464ec3))
* update qwen model name ([7813939](https://github.com/real-jiakai/next-blog/commit/7813939cca26b02d1edfddcf6b91b45a4821caa3))


### Performance Improvements

* **scrolltotop:** replace MUI IconButton with a plain button ([#10](https://github.com/real-jiakai/next-blog/issues/10)) ([6f8cdbc](https://github.com/real-jiakai/next-blog/commit/6f8cdbcbfbe813138f622998c7fa5cad9acc473e))


### BREAKING CHANGES

* English and Chinese README finished && Docker Compose deployment finished && All blog features finished.
* Supabase integrates with Next.js
* Install @semantic-release/git -D
* Update .releaserc

## [4.0.2](https://github.com/simple-is-awesome/simple/compare/v4.0.1...v4.0.2) (2023-05-25)


### Bug Fixes

* fix auto scroll && improve docker-compose.yml file ([b083131](https://github.com/simple-is-awesome/simple/commit/b0831311487999fc3fae462b89e2495ae2bdfe12))

## [4.0.1](https://github.com/simple-is-awesome/simple/compare/v4.0.0...v4.0.1) (2023-05-01)


### Bug Fixes

* :bug: add aplayer and etc. feature && fix navbar md ui bug ([ce7edff](https://github.com/simple-is-awesome/simple/commit/ce7edff1dedf862ba4502571f6c674512d9d6394c))

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
