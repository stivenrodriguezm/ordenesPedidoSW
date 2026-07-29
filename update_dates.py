import os
import glob

directory = '/Users/stiven/Desktop/Coding/Lottus/ordenesPedidoSW/src'
onclick_string = ' onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}'

files = glob.glob(os.path.join(directory, '**/*.jsx'), recursive=True)
count = 0

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'type="date"' in content:
        lines = content.split('\n')
        new_lines = []
        modified = False
        for line in lines:
            if 'type="date"' in line and 'showPicker' not in line:
                line = line.replace('type="date"', 'type="date"' + onclick_string)
                modified = True
            new_lines.append(line)
        
        if modified:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(new_lines))
            count += 1
            print(f"Updated {file_path}")

print(f"Total files updated: {count}")
