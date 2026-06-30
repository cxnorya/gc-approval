using System;
using System.IO;
using System.Runtime.InteropServices;

class SqliteWALFix
{
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_open([MarshalAs(UnmanagedType.LPStr)] string filename, out IntPtr db);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_exec(IntPtr db, [MarshalAs(UnmanagedType.LPStr)] string sql, IntPtr callback, IntPtr arg, out IntPtr errMsg);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern int sqlite3_close(IntPtr db);
    
    [DllImport("winsqlite3", CallingConvention = CallingConvention.Cdecl)]
    static extern IntPtr sqlite3_errmsg(IntPtr db);

    public static int Main(string[] args)
    {
        if (args.Length < 1) { Console.Error.WriteLine("Usage: SqliteWALFix <dbpath>"); return 1; }
        string path = args[0];
        if (!File.Exists(path)) { Console.Error.WriteLine("File not found: " + path); return 1; }
        
        IntPtr db;
        int rc = sqlite3_open(path, out db);
        if (rc != 0) { Console.Error.WriteLine("Open failed: " + rc); return 1; }
        
        IntPtr err;
        rc = sqlite3_exec(db, "PRAGMA journal_size_limit = 65536", IntPtr.Zero, IntPtr.Zero, out err);
        if (rc != 0) { Console.Error.WriteLine("journal_size_limit failed: " + Marshal.PtrToStringAnsi(sqlite3_errmsg(db))); sqlite3_close(db); return 1; }
        
        rc = sqlite3_exec(db, "PRAGMA wal_autocheckpoint = 500", IntPtr.Zero, IntPtr.Zero, out err);
        if (rc != 0) { Console.Error.WriteLine("wal_autocheckpoint failed: " + Marshal.PtrToStringAnsi(sqlite3_errmsg(db))); sqlite3_close(db); return 1; }
        
        rc = sqlite3_exec(db, "PRAGMA wal_checkpoint(TRUNCATE)", IntPtr.Zero, IntPtr.Zero, out err);
        if (rc != 0) { Console.Error.WriteLine("checkpoint failed: " + Marshal.PtrToStringAnsi(sqlite3_errmsg(db))); sqlite3_close(db); return 1; }
        
        sqlite3_close(db);
        Console.WriteLine("OK: " + path);
        return 0;
    }
}
