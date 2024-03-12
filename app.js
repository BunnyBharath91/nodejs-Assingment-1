const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");

const dbPath = path.join(__dirname, "todoApplication.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server is running on http://localhost:3001/");
    });
  } catch (error) {
    console.error("Error during database initialization:", error.message);
    process.exit(1);
  }
};

initializeDBandServer();

const hasStatusPriorityCategory = (requestQuery) => {
  return (
    requestQuery.status !== undefined &&
    requestQuery.priority !== undefined &&
    requestQuery.category !== undefined
  );
};

const hasStatusPriorityOnly = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasStatusCategoryOnly = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.category !== undefined
  );
};

const hasPriorityCategoryOnly = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};

const hasStatusOnly = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityOnly = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasCategoryOnly = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const modifyTodoObject = (todoObject) => ({
  id: todoObject.id,
  todo: todoObject.todo,
  priority: todoObject.priority,
  status: todoObject.status,
  category: todoObject.category,
  dueDate: format(new Date(todoObject.due_date), "yyyy-MM-dd"),
});

app.get("/todos/", async (request, response) => {
  let getTodosQuery;
  let data;
  const { status, priority, category, search_q = "" } = request.query;

  switch (true) {
    case hasStatusPriorityCategory(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           status='${status}' AND 
           priority='${priority}' AND
           category='${category}';

           `;
      break;
    case hasStatusPriorityOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           status='${status}' AND 
           priority='${priority}';`;
      break;
    case hasStatusCategoryOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           status='${status}' AND 
           category='${category}';

           `;
      break;

    case hasPriorityCategoryOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           priority='${priority}' AND 
           category='${category}';

           `;
      break;
    case hasStatusOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           status='${status}';
           `;
      break;
    case hasPriorityOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           priority='${priority}';
           `;
      break;
    case hasCategoryOnly(request.query):
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%' AND
           category='${category}';
           `;
      break;
    default:
      getTodosQuery = `
           SELECT * FROM 
           todo WHERE 
           todo LIKE '%${search_q}%';
           `;
  }

  data = await db.all(getTodosQuery);
  const modifiedData = data.map((eachItem) => modifyTodoObject(eachItem));

  response.send(modifiedData);
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoDataQuery = `
     SELECT * FROM 
     todo 
     WHERE id=${todoId}
    `;
  const data = await db.get(getTodoDataQuery);
  response.send(modifyTodoObject(data));
});

app.get("/agenda/", async (request, response) => {
  const { date = "" } = request.query;
  const formattedDate = date ? format(new Date(date), "yyyy-MM-dd") : "";
  const getTodoItemsQuery = `
    SELECT * FROM 
    todo 
    WHERE 
    due_date=${formattedDate}
    `;
  const data = await db.all(getTodoItemsQuery);
  const updatedData = data.map((eachItem) => modifyTodoObject(eachItem));
  response.send(updatedData);
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const addNewTodoItemQuery = `
    INSERT INTO todo 
    (id,todo,priority,status,category,due_date) 
    values(${id},'${todo}','${priority}','${status}','${category}','${dueDate}')
    `;
  await db.run(addNewTodoItemQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  let updatedRow;
  switch (true) {
    case request.body.todo !== undefined:
      updatedRow = "TODO";
      break;
    case request.body.priority !== undefined:
      updatedRow = "PRIORITY";
      break;
    case request.body.status !== undefined:
      updatedRow = "STATUS";
      break;
    case request.body.category !== undefined:
      updatedRow = "CATEGORY";
      break;
    default:
      updatedRow = "DUE DATE";
  }
  const { todoId } = request.params;
  const getUpdatingObjectQuery = `
    SELECT * FROM todo WHERE id=${todoId}
    `;
  const updatingObject = await db.get(getUpdatingObjectQuery);
  const {
    todo = updatingObject.todo,
    priority = updatingObject.priority,
    status = updatingObject.status,
    category = updatingObject.category,
    dueDate = updatingObject.due_date,
  } = request.body;

  const updateObjectQuery = `
UPDATE todo SET 
todo='${todo}',priority='${priority}',status='${status}',category='${category}',due_date='${dueDate}'
WHERE id=${todoId}
`;
  await db.run(updateObjectQuery);
  response.send(`${updatedRow} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteItemQuery = `
    DELETE FROM todo 
    WHERE id=${todoId}
    `;
  await db.run(deleteItemQuery);
  response.send("Todo Deleted");
});

module.exports = app;
