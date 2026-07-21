import pymysql

try:
    connection = pymysql.connect(host='localhost', user='root', password='Excel@123', database='quiz_copy', port=3306)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE roles SET role_type='teacher' WHERE name='Teacher';")
    connection.commit()
    print("Role 'Teacher' updated successfully to type 'teacher'.")
    connection.close()
except Exception as e:
    print(e)
