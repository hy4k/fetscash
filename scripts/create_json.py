import json, os

sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations', '003_foreign_remittance_tracker.sql')
with open(sql_path, 'r', encoding='utf-8') as f:
    sql = f.read()

out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tmp_query.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump({'query': sql}, f)

print('written', out_path, 'size', len(sql))
