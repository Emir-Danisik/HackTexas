Class User.Documents Extends %Persistent
{

Property Title As %String;

Property creationDate As %Date;

Property Content As %String;

// Add method to query all documents

ClassMethod GetAllDocuments() As %ResultSet
{
    Set tRS = ##class(%ResultSet).%New()
    Do tRS.Prepare("SELECT ID,Title,Content FROM User.Documents")
    Do tRS.Execute()

    return tRS
}

// Add display method

ClassMethod DisplayAll()
{
    Set tRS = ..GetAllDocuments()
    While tRS.Next() {
        Write !,"ID: ",tRS.GetData(1)  // ID is column 1
        Write !,"Title: ",tRS.GetData(2)  // Title is column 2
        Write !,"Content: ",tRS.GetData(3)  // Content is column 3
        Write !,"-------------------"
    }
    Do tRS.Close()
}

Storage Default
{
<Data name="DocumentsDefaultData">
<Attribute>%%CLASSNAME</Attribute>
<Subscript>"1"</Subscript>
<Value name="1">
<Value>Title</Value>
</Value>
<Value name="2">
<Value>Date</Value>
</Value>
<Value name="3">
<Value>Content</Value>
</Value>
<Value name="4">
<Value>%%CLASSNAME</Value>
</Value>
<Value name="5">
<Value>creationDate</Value>
</Value>
</Data>
<DataLocation>^User.DocumentsD</DataLocation>
<DefaultData>DocumentsDefaultData</DefaultData>
<IdLocation>^User.DocumentsD</IdLocation>
<IndexLocation>^User.DocumentsI</IndexLocation>
<StreamLocation>^User.DocumentsS</StreamLocation>
<Type>%Storage.Persistent</Type>
}

}
