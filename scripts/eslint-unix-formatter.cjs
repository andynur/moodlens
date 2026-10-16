// One line per problem (`path:line:col: message [rule]`), so scripts/check.mjs can quote it briefly.
module.exports = (results) =>
  results
    .flatMap((result) =>
      result.messages.map(
        (m) =>
          `${result.filePath}:${m.line ?? 0}:${m.column ?? 0}: ${m.message} [${m.severity === 2 ? 'error' : 'warning'}/${m.ruleId ?? 'core'}]`
      )
    )
    .join('\n');
