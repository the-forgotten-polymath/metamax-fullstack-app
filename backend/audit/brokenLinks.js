const axios = require('axios');

async function checkBrokenLinks(links) {
  const uniqueLinks = [...new Set(links.filter(Boolean))].slice(0, 20);
  if (!uniqueLinks.length) {
    return { brokenCount: 0, checkedCount: 0 };
  }

  const results = await Promise.allSettled(
    uniqueLinks.map((link) =>
      axios.head(link, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: () => true,
      })
    )
  );

  const brokenCount = results.filter((result) => {
    if (result.status === 'rejected') {
      return true;
    }

    return result.value.status >= 400;
  }).length;

  return {
    brokenCount,
    checkedCount: uniqueLinks.length,
  };
}

module.exports = { checkBrokenLinks };
