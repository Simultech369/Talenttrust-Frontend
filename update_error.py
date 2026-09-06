with open('src/app/milestones/page.tsx', 'r', encoding='utf-8') as f:
    original = f.read()

new_content = original.replace(
    "| { status: 'error' }",
    "| { status: 'error'; error: { code: 'FETCH_FAILED'; message: string } }"
)

new_content = new_content.replace(
    "setFetchState({ status: 'error' });",
    "setFetchState({ status: 'error', error: { code: 'FETCH_FAILED', message: 'Unable to load milestones' } });"
)

with open('src/app/milestones/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
