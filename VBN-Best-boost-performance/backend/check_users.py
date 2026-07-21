import pymysql

try:
    connection = pymysql.connect(host='localhost', user='root', password='Excel@123', database='quiz_copy', port=3306)
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM users;")
        count = cursor.fetchone()[0]
        print(f"Users in quiz_copy: {count}")
    connection.close()
except Exception as e:
    print(e)
