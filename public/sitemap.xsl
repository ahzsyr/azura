<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head>
        <title>XML Sitemap</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 2rem; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>XML Sitemap</h1>
        <xsl:choose>
          <xsl:when test="s:sitemapindex">
            <table>
              <tr><th>URL</th><th>Last Modified</th></tr>
              <xsl:for-each select="s:sitemapindex/s:sitemap">
                <tr>
                  <td><xsl:value-of select="s:loc"/></td>
                  <td><xsl:value-of select="s:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <table>
              <tr><th>URL</th><th>Last Modified</th><th>Image</th></tr>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td><xsl:value-of select="s:loc"/></td>
                  <td><xsl:value-of select="s:lastmod"/></td>
                  <td><xsl:value-of select="image:image/image:loc"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
