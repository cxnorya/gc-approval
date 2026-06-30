using System;
using System.IO;
using System.Runtime.InteropServices;

class CheckPerms
{
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_open_v2(string filename, out IntPtr db, int flags, string vfs);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_close(IntPtr db);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern IntPtr sqlite3_errmsg(IntPtr db);

    // SQLITE_OPEN_READWRITE = 0x00000002, SQLITE_OPEN_CREATE = 0x00000004
    const int SQLITE_OPEN_READWRITE = 2;
    const int SQLITE_OPEN_CREATE = 4;
    
    public static int Main(string[] args)
    {
        string path = @"C:\Users\wzyyxx\.codex\state_5.sqlite";
        
        // Normal open
        IntPtr db;
        int rc = sqlite3_open_v2(path, out db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, null);
        Console.WriteLine("Normal open (RW|CREATE): rc=" + rc);
        if (rc != 0) {
            IntPtr err = sqlite3_errmsg(db);
            Console.WriteLine("  Error: " + Marshal.PtrToStringAnsi(err));
        }
        if (db != IntPtr.Zero) sqlite3_close(db);
        
        // Open with READWRITE only (no CREATE)
        rc = sqlite3_open_v2(path, out db, SQLITE_OPEN_READWRITE, null);
        Console.WriteLine("Open READWRITE: rc=" + rc);
        if (rc != 0) {
            IntPtr err = sqlite3_errmsg(db);
            Console.WriteLine("  Error: " + Marshal.PtrToStringAnsi(err));
        }
        if (db != IntPtr.Zero) sqlite3_close(db);
        
        // Check the actual file permissions
        try {
            var fs = new FileStream(path, FileMode.Open, FileAccess.ReadWrite);
            fs.Close();
            Console.WriteLine("FileStream READWRITE: OK");
        } catch (Exception ex) {
            Console.WriteLine("FileStream READWRITE: " + ex.Message);
        }
        
        return 0;
    }
}
