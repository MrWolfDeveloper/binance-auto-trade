var DatabaseQuery = DatabaseQuery || {};

// Add Require Modules
var Mongoose = require('mongoose');

Mongoose.set('useNewUrlParser', true);
Mongoose.set('useFindAndModify', false);
Mongoose.set('useCreateIndex', true);
Mongoose.set('useUnifiedTopology', true);

DatabaseQuery = {
	/** Default Database Name */
	DatabaseName: 'EXBDatabse',

	DatabaseConnect: async (DatabaseURL) => {
		var DatabaseConnection = Mongoose.connect(DatabaseURL);
		var DB = Mongoose.connection;

		return new Promise((Resolve, Reject) => {
			DB.on('error', (Error) => {
				Reject(Error);
			});

			DB.once('open', () => {
				Resolve('Database Connected!');
			});
		});
	},

	/**
     *  @desc Make Database Connection And When Connected Successfully Call Your Method From Referred Object (Data.DBQueryMethod)
     *
     *  @param Dictionary Objects Data: {
     *                              DatabaseName: "DatabaseName", (Type String)
     *                              DBQueryMethod: "Method", (Type String - Call Method "Insert", "Select", "Update", "Drop")
     *                              MethodData: { (Type Dictionary Objects - Depending On The Method Called) }
     *                          }
     *
     *  @param Function CallBack (
     *                      Status, (Status Of Opration - Type Boolean)
     *                      ReturnData, (Inserted Data [{} When The Operation Fails] - Type Dictionary Objects)
     *                      Error (When The Operation Finish Successfully This Value Is Null - Type String)
     *                  )
     */
	MakeDatabaseQuery: (Data, CallBack) => {
		// Set Default Database Name
		if (!Data.DatabaseName) Data.DatabaseName = DatabaseQuery.DatabaseName;

		const { DatabaseName, DBQueryMethod, MethodData } = Data;

		DatabaseQuery[DBQueryMethod](MethodData, (Status, ReturnData, Error) => {
			CallBack(Status, ReturnData, Error);
		});
	},

	AsyncMakeDatabaseQuery: async (Data) => {
		// Set Default Database Name
		if (!Data.DatabaseName) Data.DatabaseName = DatabaseQuery.DatabaseName;

		const { DatabaseName, DBQueryMethod, MethodData } = Data;

		return new Promise((Resolve, Reject) => {
			DatabaseQuery[DBQueryMethod](MethodData, (Status, ReturnData, Error) => {
				if (!Status) return Reject(Error);

				return Resolve([ Status, ReturnData, Error ]);
			});
		});
	},

	/**
     *  @desc Adding Your Data To Database
     *
     *  @param Dictionary Objects Data: {
     *                              ModelName: "ModelName", (Type String)
     *                              InsertData: { (Type Dictionary Objects)
     *                                  Key: "Value" (Type String)
     *                              }
     *                          }
     *
     *  @param Function CallBack (
     *                      Status, (Status Of Opration - Type Boolean)
     *                      ReturnData, (Inserted Data [{} When The Operation Fails] - Type Dictionary Objects)
     *                      Error (When The Operation Finish Successfully This Value Is Null - Type String)
     *                  )
     */
	Insert: (MethodData, CallBack) => {
		const { ModelName, InsertData } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		var InsertDataModel = new Models(InsertData);

		InsertDataModel.save((Error, InsertDataInfo) => {
			if (Error) CallBack(false, {}, Error);
			else CallBack(true, InsertDataInfo);
		});
	},

	InsertMany: (MethodData, CallBack) => {
		const { ModelName, InsertData } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		// var InsertDataModel = new Models(InsertData);

		Models.insertMany(InsertData)
			.then((InsertDataInfo) => {
				CallBack(true, InsertDataInfo);
			})
			.catch((Error) => {
				CallBack(false, {}, Error);
			});
	},

	/**
     *  @desc Select Data From Database
     *
     *  @param Dictionary Objects Data: {
     *                              ModelName: "ModelName", (Type String)
     *                              SelectKeys: "Keyes", (e.g '_id PostDate PostTitle')
     *                              SelectOptions: {(SelectOptions - Dictionary Objects)}
     *                              Where: { (Type Dictionary Objects - {} When You Want Select All Data From Table)
     *                                  Key: "Value" (Type String)
     *                              }
     *                          }
     *
     *  @param Function CallBack (
     *                      Status, (Status Of Opration - Type Boolean)
     *                      ReturnData, (Inserted Data [{} When The Operation Fails] - Type Dictionary Objects)
     *                      Error (When The Operation Finish Successfully This Value Is Null - Type String)
     *                  )
     */
	Select: (MethodData, CallBack) => {
		const { ModelName, Where, SelectKeys, SelectOptions } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		Models.find(Where, SelectKeys, SelectOptions, (Error, SelectedData) => {
			if (Error) CallBack(false, {}, Error);
			else CallBack(true, SelectedData);
		}).collation({ locale: 'en', strength: 2 });
	},

	/**
     *  @desc Update Data In Database
     *
     *  @param Dictionary Objects Data: {
     *                              ModelName: "ModelName", (Type String)
     *                              NewData: { (Type Dictionary Objects)
     *                                  Key: "Value" (Type String)
     *                              },
     *                              MongooseUMO: { (Type Dictionary Objects - Mongoose Update Method Options)
     *                                  Key: "Value"
     *                              }
     *                              Which: { (Type Dictionary Objects - Row Key For Update)
     *                                  Key: "Value" (Type String)
     *                              }
     *                          }
     *
     *  @param Function CallBack (
     *                      Status, (Status Of Opration - Type Boolean)
     *                      ReturnData, (Inserted Data [{} When The Operation Fails] - Type Dictionary Objects)
     *                      Error (When The Operation Finish Successfully This Value Is Null - Type String)
     *                  )
     */
	Update: (MethodData, CallBack) => {
		const { ModelName, Which, NewData, MongooseUMO } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		Models.updateOne(Which, NewData, MongooseUMO, function(Error, UpdateData) {
			if (Error) CallBack(false, {}, Error);
			else CallBack(true, UpdateData);
		});
	},

	UpdateMany: (MethodData, CallBack) => {
		const { ModelName, Which, NewData, MongooseUMO } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		Models.updateMany(Which, NewData, MongooseUMO, function(Error, UpdateData) {
			if (Error) CallBack(false, {}, Error);
			else CallBack(true, UpdateData);
		});
	},

	/**
     *  @desc Remove Data From Database
     *
     *  @param Dictionary Objects Data: {
     *                              ModelName: "ModelName", (Type String)
     *                              Which: { (Type Dictionary Objects - Row Key For Drop)
     *                                  Key: "Value" (Type String)
     *                              }
     *                          }
     *
     *  @param Function CallBack (
     *                      Status, (Status Of Opration - Type Boolean),
     *                      DeletedKey, (Type Dictionary Objects)
     *                      Error (When The Operation Finish Successfully This Value Is Null - Type String)
     *                  )
     */
	Drop: (MethodData, CallBack) => {
		const { ModelName, Which } = MethodData;

		var Models = require(`${__dirname}/../../database-schema/${ModelName}.js`);

		Models.deleteOne(Which, function(Error) {
			if (Error) CallBack(false, Which, Error);
			else CallBack(true, Which);
		});
	},

	GetCollectionList: (CallBack) => {
		//  Connect To Database
		var DatabaseConnection = Mongoose.connect(`mongodb://localhost:27017/${DatabaseQuery.DatabaseName}`);

		var DB = Mongoose.connection;

		//  Database Connection Failed
		DB.on('error', (Error) => {
			CallBack(false, {}, Error);
		});

		//  Database Connection Successfully
		DB.once('open', () => {
			DB.db.listCollections().toArray(function(Error, Names) {
				CallBack(Names);
			});
		});
	}
};

exports.DatabaseQuery = DatabaseQuery;
