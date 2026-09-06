import glob, re

test_files = glob.glob('src/app/**/__tests__/*.test.tsx', recursive=True) + glob.glob('src/app/milestones/__tests__/*.test.tsx', recursive=True)

for file in set(test_files):
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '<MilestonesPage' in content:
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if 'render(' in line and '<MilestonesPage' in line and 'await act' not in line:
                new_lines.append('    await act(async () => {});')
        
        content = '\n'.join(new_lines)
        # ensure act is imported
        if ' act ' not in content and '{ act }' not in content and 'act,' not in content:
            content = content.replace('render,', 'render, act,')
            
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Patched {file}')
