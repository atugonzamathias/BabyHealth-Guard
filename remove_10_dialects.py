for fpath in ['index.html', 'frontend/index.html', 'backend/src/main/resources/static/index.html']:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('<span>MaamaCare AI (10 Dialects)</span>', '<span>MaamaCare AI</span>')
    new_content = new_content.replace('MaamaCare AI (10 Dialects)', 'MaamaCare AI')
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {fpath}")

