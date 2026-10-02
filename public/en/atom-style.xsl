<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/atom:feed/atom:title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style type="text/css">
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif;
            line-height: 1.7;
            color: #2f2f2d;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f4ed;
          }
          .header {
            padding: 30px 0 20px;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 2em;
            line-height: 1.25;
            color: #141413;
          }
          .header p {
            margin: 0;
            color: #63615a;
          }
          .rss-icon {
            width: 32px;
            height: 32px;
            margin-bottom: 12px;
            fill: #2c6e55;
          }
          .subscribe-box {
            background: none;
            border: 0;
            border-top: 1px solid rgba(20, 20, 19, 0.13);
            border-radius: 0;
            padding: 20px 0;
            margin: 0;
          }
          .subscribe-box p {
            margin: 0 0 10px 0;
            font-size: 0.9em;
            color: #63615a;
          }
          .subscribe-box code {
            display: block;
            background: #edeae1;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.85em;
            word-break: break-all;
            color: #141413;
          }
          .entry {
            background: none;
            border: 0;
            border-top: 1px solid rgba(20, 20, 19, 0.13);
            border-radius: 0;
            padding: 20px 0;
            margin: 0;
          }
          .entry-title {
            margin: 0 0 6px 0;
            font-size: 1.3em;
            line-height: 1.4;
          }
          .entry-title a {
            color: #141413;
            text-decoration: none;
          }
          .entry-title a:hover {
            color: #2c6e55;
          }
          .entry-meta {
            font-size: 0.85em;
            color: #63615a;
            margin-bottom: 12px;
            font-variant-numeric: tabular-nums;
          }
          .entry-content {
            overflow: hidden;
          }
          .entry-content a,
          .entry-content summary {
            color: #2c6e55;
          }
          .entry-content a:hover,
          .entry-content summary:hover {
            color: #1f5a44;
          }
          .entry-content summary {
            cursor: pointer;
            font-weight: 500;
            padding: 5px 0;
            user-select: none;
          }
          .entry-content details[open] summary {
            margin-bottom: 15px;
          }
          .entry-content .content-body {
            padding-top: 10px;
          }
          .entry-content img {
            max-width: 100%;
            height: auto;
          }
          .entry-content figure {
            margin: 1em 0;
          }
          .entry-content video {
            display: block;
            width: auto;
            max-width: 100%;
            max-height: 70vh;
            height: auto;
          }
          .entry-content iframe {
            display: block;
            width: 100%;
            max-width: 100%;
            aspect-ratio: 16 / 9;
            height: auto;
            border: 0;
          }
          .entry-content h2 {
            font-size: 1.2em;
            margin-top: 28px;
            padding-top: 12px;
            border-top: 1px solid rgba(20, 20, 19, 0.13);
            color: #141413;
          }
          .entry-content h3 {
            color: #141413;
          }
          .entry-content blockquote {
            border-left: 2px solid rgba(20, 20, 19, 0.13);
            margin: 10px 0;
            padding-left: 15px;
            color: #63615a;
          }
          .entry-content pre {
            background: #edeae1;
            padding: 10px;
            overflow-x: auto;
          }
          .entry-content code {
            background: #edeae1;
            color: #141413;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 0.9em;
          }
          .entry-content pre code {
            background: none;
            padding: 0;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: #1b1a18;
              color: #e6e3db;
            }
            .header h1,
            .entry-title a,
            .entry-content h2,
            .entry-content h3 {
              color: #f4f2ec;
            }
            .header p,
            .subscribe-box p,
            .entry-meta,
            .entry-content blockquote {
              color: #a9a59b;
            }
            .rss-icon {
              fill: #86cbaa;
            }
            .subscribe-box code,
            .entry-content pre,
            .entry-content code {
              background: #2e2c28;
              color: #f4f2ec;
            }
            .subscribe-box,
            .entry,
            .entry-content h2 {
              border-top-color: rgba(255, 255, 255, 0.12);
            }
            .entry-content blockquote {
              border-left-color: rgba(255, 255, 255, 0.12);
            }
            .entry-title a:hover,
            .entry-content a,
            .entry-content summary {
              color: #86cbaa;
            }
            .entry-content a:hover,
            .entry-content summary:hover {
              color: #a6dcc3;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <svg class="rss-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z"/>
          </svg>
          <h1><xsl:value-of select="/atom:feed/atom:title"/></h1>
          <p><xsl:value-of select="/atom:feed/atom:subtitle"/></p>
        </div>
        <div class="subscribe-box">
          <p>This is an RSS feed. Subscribe by copying the URL into your news reader.</p>
          <code><xsl:value-of select="/atom:feed/atom:link[@rel='alternate']/@href"/>/index.xml</code>
        </div>
        <xsl:for-each select="/atom:feed/atom:entry">
          <div class="entry">
            <h2 class="entry-title">
              <a>
                <xsl:attribute name="href">
                  <xsl:value-of select="atom:link/@href"/>
                </xsl:attribute>
                <xsl:value-of select="atom:title"/>
              </a>
            </h2>
            <div class="entry-meta">
              <xsl:value-of select="substring(atom:updated, 1, 10)"/>
            </div>
            <div class="entry-content">
              <xsl:choose>
                <!-- Firefox's XSLT engine ignores disable-output-escaping and
                     would show the post HTML as text, so it links out instead. -->
                <xsl:when test="system-property('xsl:vendor') = 'Transformiix'">
                  <a href="{atom:link/@href}">Read the full post →</a>
                </xsl:when>
                <xsl:otherwise>
                  <details>
                    <summary>Expand content</summary>
                    <div class="content-body">
                      <xsl:value-of select="atom:content" disable-output-escaping="yes"/>
                    </div>
                  </details>
                </xsl:otherwise>
              </xsl:choose>
            </div>
          </div>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
