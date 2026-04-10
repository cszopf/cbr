import os

src = '/Users/chrissauerzopf/cbr/backend/sql_batches'
dst = '/Users/chrissauerzopf/cbr/backend/sql_mini_batches'
os.makedirs(dst, exist_ok=True)

for i in range(117):
    fname = f'batch_{i:03d}.sql'
    fpath = os.path.join(src, fname)
    with open(fpath, 'r') as f:
        lines = f.readlines()

    header = lines[0].strip()
    data_lines = lines[1:]

    chunk_size = 100
    chunk_idx = 0
    for start in range(0, len(data_lines), chunk_size):
        chunk = data_lines[start:start+chunk_size]
        last = chunk[-1].rstrip()
        if last.endswith(','):
            chunk[-1] = last[:-1] + ';\n'

        out_name = f'batch_{i:03d}_{chunk_idx:02d}.sql'
        out_path = os.path.join(dst, out_name)
        with open(out_path, 'w') as out:
            out.write(header + '\n')
            out.writelines(chunk)
        chunk_idx += 1

print(f'Created mini batches in {dst}')
print(f'Total files: {len(os.listdir(dst))}')
first = os.path.join(dst, 'batch_000_00.sql')
print(f'First mini batch size: {os.path.getsize(first)} bytes')
print(f'First mini batch lines: {sum(1 for _ in open(first))}')
