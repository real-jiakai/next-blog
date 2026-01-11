<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="zh">
      <head>
        <title><xsl:value-of select="/atom:feed/atom:title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style type="text/css">
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
          }
          .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 2em;
            color: #111;
          }
          .header p {
            margin: 0;
            color: #666;
          }
          .rss-icon {
            width: 40px;
            height: 40px;
            margin-bottom: 15px;
          }
          .subscribe-box {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px 20px;
            margin: 20px 0;
          }
          .subscribe-box p {
            margin: 0 0 10px 0;
            font-size: 0.9em;
            color: #666;
          }
          .subscribe-box code {
            display: block;
            background: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.85em;
            word-break: break-all;
            color: #c2410c;
          }
          .entry {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .entry-title {
            margin: 0 0 10px 0;
            font-size: 1.3em;
          }
          .entry-title a {
            color: #2563eb;
            text-decoration: none;
          }
          .entry-title a:hover {
            text-decoration: underline;
          }
          .entry-meta {
            font-size: 0.85em;
            color: #666;
            margin-bottom: 15px;
          }
          .entry-content {
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            overflow: hidden;
          }
          .entry-content summary {
            cursor: pointer;
            color: #2563eb;
            font-weight: 500;
            padding: 5px 0;
            user-select: none;
          }
          .entry-content summary:hover {
            color: #1d4ed8;
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
            border-radius: 4px;
          }
          .entry-content h2 {
            font-size: 1.2em;
            margin-top: 20px;
          }
          .entry-content a {
            color: #2563eb;
          }
          .entry-content blockquote {
            border-left: 3px solid #e5e7eb;
            margin: 10px 0;
            padding-left: 15px;
            color: #666;
          }
          .entry-content pre {
            background: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
          }
          .entry-content code {
            background: #f3f4f6;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 0.9em;
          }
          .entry-content pre code {
            background: none;
            padding: 0;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background: #111827;
              color: #e5e7eb;
            }
            .header {
              border-bottom-color: #374151;
            }
            .header h1 {
              color: #f9fafb;
            }
            .header p {
              color: #9ca3af;
            }
            .subscribe-box {
              background: #1f2937;
              border-color: #374151;
            }
            .subscribe-box p {
              color: #9ca3af;
            }
            .subscribe-box code {
              background: #374151;
              color: #fb923c;
            }
            .entry {
              background: #1f2937;
              border-color: #374151;
            }
            .entry-title a {
              color: #60a5fa;
            }
            .entry-meta {
              color: #9ca3af;
            }
            .entry-content {
              border-top-color: #374151;
            }
            .entry-content summary {
              color: #60a5fa;
            }
            .entry-content summary:hover {
              color: #93c5fd;
            }
            .entry-content blockquote {
              border-left-color: #374151;
              color: #9ca3af;
            }
            .entry-content pre,
            .entry-content code {
              background: #374151;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <svg class="rss-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316">
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
              <details>
                <summary>展开全文</summary>
                <div class="content-body">
                  <xsl:value-of select="atom:content" disable-output-escaping="yes"/>
                </div>
              </details>
            </div>
          </div>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
