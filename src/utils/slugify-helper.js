import slugify from 'slugify';

/**
 * Create a URL-friendly slug from a string
 */
export function createSlug(text) {
  return slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

/**
 * Create a branch name from issue key and title
 */
export function createBranchName(issueKey, title, type = 'feat') {
  const slug = createSlug(title);
  return `${type}/${issueKey}-${slug}`;
}
