var async = require('async');
var _ = require('underscore');
var app = require('loopback');
var Computer = app.getModel("Computer");
var libvirt = require('libvirt');
var uuid = require('node-uuid');
var http = require("http")
var net = require("net");

var schedule = require("node-schedule");

module.exports = function (Reservation) {
  Reservation.observe("after save", function(ctx,next) {
    console.log(ctx.instance.startDate)
    var loadDate = new Date(new Date(ctx.instance.startDate)-600000)
    console.log("After save, loaddate: " + loadDate)

    schedule.scheduleJob(loadDate,function() {
      console.log("Load")

      var options = {
        host: "127.0.0.1",
        //hostname: "www.google.com",
        path: "/loadByUUID/" + ctx.instance.clientId,
        port: "3002",
        //method: "GET"
      }
      http.get(options,function(response) {
        console.log("In the http get cb")
        var Hypervisor = libvirt.Hypervisor;
        // look up super pc's IP with help from computerID.
        // I.E ctx.instance.computerId
        Computer.findOne({
        fields : {ip:true},
        where : {id: ctx.instance.computerId}
        }, function(err,computer) {
          var startDate = new Date(ctx.instance.startDate)
          console.log(startDate)
          schedule.scheduleJob(startDate,function() {

            // Make connection to hypervisor, start domain
            console.log(computer)
            var hypervisor = new Hypervisor('qemu+tcp://localhost/system');
            var clientId = ctx.instance.clientId
            var newuuid = uuid.v4();
            var imgfile = "test";
            var hardcoded_xml = "<domain type='kvm' id='7'><name>" + clientId + "</name><uuid>" + newuuid + "</uuid><memory unit='KiB'>1048576</memory><currentMemory unit='KiB'>1048576</currentMemory><vcpu placement='static'>1</vcpu><resource><partition>/machine</partition></resource><os><type arch='x86_64' machine='pc-i440fx-trusty'>hvm</type><boot dev='hd'/></os><features><acpi/><apic/><pae/></features><clock offset='utc'/><on_poweroff>destroy</on_poweroff><on_reboot>restart</on_reboot><on_crash>restart</on_crash><devices><emulator>/usr/bin/kvm-spice</emulator><disk type='file' device='disk'><driver name='qemu' type='raw'/><source file='/home/tankz/Desktop/Images/" + imgfile + ".img'/><target dev='hda' bus='ide'/><alias name='ide0-0-0'/><address type='drive' controller='0' bus='0' target='0' unit='0'/></disk><disk type='block' device='cdrom'><driver name='qemu' type='raw'/><target dev='hdc' bus='ide'/><readonly/><alias name='ide0-1-0'/><address type='drive' controller='0' bus='1' target='0' unit='0'/></disk><controller type='usb' index='0'><alias name='usb0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x2'/></controller><controller type='pci' index='0' model='pci-root'><alias name='pci.0'/></controller><controller type='ide' index='0'><alias name='ide0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x1'/></controller><controller type='virtio-serial' index='0'><alias name='virtio-serial0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x05' function='0x0'/></controller><interface type='network'><mac address='52:54:00:62:94:ac'/><source network='default'/><target dev='vnet0'/><model type='rtl8139'/><alias name='net0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x03' function='0x0'/></interface><serial type='pty'><source path='/dev/pts/26'/><target port='0'/><alias name='serial0'/></serial><console type='pty' tty='/dev/pts/26'><source path='/dev/pts/26'/><target type='serial' port='0'/><alias name='serial0'/></console><channel type='spicevmc'><target type='virtio' name='com.redhat.spice.0'/><alias name='channel0'/><address type='virtio-serial' controller='0' bus='0' port='1'/></channel><input type='mouse' bus='ps2'/><input type='keyboard' bus='ps2'/><graphics type='spice' port='5900' autoport='yes' listen='127.0.0.1'><listen type='address' address='127.0.0.1'/></graphics><video><model type='qxl' ram='65536' vram='65536' heads='1'/><alias name='video0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x02' function='0x0'/></video><memballoon model='virtio'><alias name='balloon0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x04' function='0x0'/></memballoon></devices><seclabel type='dynamic' model='apparmor' relabel='yes'><label>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</label><imagelabel>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</imagelabel></seclabel></domain>"
            var dom = hypervisor.createDomain(hardcoded_xml)

            // FORWARDING
            server = net.createServer(function (socket) {
              console.log("Connected" + socket.remoteAddress + ":" + socket.remotePort)

              var superPC_opts = {
                host: "127.0.0.1",
                port: 5900
              }

              var superPC_socket = net.connect(superPC_opts,function() {
                console.log("Connected to virtual stream");
              })


              // Data from superPC, write it to user.
              superPC_socket.on("data",function(data) {
                socket.write(data);

              })

              // Data from user, write it to superPC.
              socket.on("data",function (data) {
                  superPC_socket.write(data);
              })

              socket.on("end",function(err) {
                console.log("Client ended");
                socket.end();
                superPC_socket.end();
              })

              superPC_socket.on("end",function(err) {
                console.log("Super pc ended stream?")
                socket.end();
                superPC_socket.end();
              })

            });
            server.listen(9000,"localhost",function() {
              console.log("Forwaring service ACVERTERAVATED")
            })
            // FORWARDING END

            var finishDate = new Date(ctx.instance.finishDate)
            console.log(finishDate)
            schedule.scheduleJob(finishDate,function() {
              // Close the connection between superPC and user.
              server.close();
              // Destroy domain
              console.log("FINISHING SESSION: " + finishDate)
              dom.destroy()

              // Call supercomputer server to rename files back, and move them to cluster
            })
          })
        })
      }).on("error",function(e) {
        console.log("ERROR")
      })
    })

    next();
  })


  Reservation.observe('before save', function validateReservation(ctx, next) {
    Reservation.available(ctx.instance, function (err, available) {
      if (err) {
        throw err;
      }
      if (_.contains(available, ctx.instance.computerId)) {
        next();
      } else {
        next(new Error('This SUPER PC is already reserved'));
      }
    });
  });

  Reservation.available = function (dates, cb) {
    async.parallel({
      insideReservations: async.apply(insideReservations, dates),
      allComputers: async.apply(allComputers)
    }, function (err, results) {
      if (err) {
        throw err;
      }
      
      // I DONT NNED DO THIS
      var insideReservations = _.uniq(computerIdsToComputerIds(results.insideReservations));
      var allComputers = _.uniq(idToComputerIds(results.allComputers));
      cb(null, _.difference(allComputers, insideReservations));
    });
  };

        // I DONT NNED DO THIS
  function computerIdsToComputerIds(array) {
    var retval = [];
    array.forEach(function (entry) {
      retval.push(entry.computerId);
    });
    return retval;
  }

        // I DONT NNED DO THIS
  function idToComputerIds(array) {
    var retval = [];
    array.forEach(function (entry) {
      retval.push(entry.id);
    });
    return retval;
  }

  function insideReservations(dates, cb) {
    Reservation.find({
      fields: {
        computerId: true
      },
      where: {
        or: [{
          startDate: {
            between: [dates.startDate, dates.finishDate]
          }
          }, {
          finishDate: {
            between: [dates.startDate, dates.finishDate]
          }
          }, {
          and: [{
            startDate: {
              lte: dates.startDate
            }
          }, {
            finishDate: {
              gte: dates.finishDate
            }
          }]
        }]
      }
    }, cb);
  }

  function allComputers(cb) {
    Computer.find({
      fields: {
        id: true
      }
    }, cb);
  }

  Reservation.remoteMethod(
    'available', {
      accepts: {
        arg: 'dates',
        type: 'Object',
        http: {
          source: 'body'
        }
      },
      returns: {
        arg: 'available',
        type: 'array'
      }
    }
  );

};

var hardcoded_xml = "<domain type='kvm' id='7'><name>" + + "</name><uuid>d81d1eb8-798b-2462-0859-6853f7172aad</uuid><memory unit='KiB'>1048576</memory><currentMemory unit='KiB'>1048576</currentMemory><vcpu placement='static'>1</vcpu><resource><partition>/machine</partition></resource><os><type arch='x86_64' machine='pc-i440fx-trusty'>hvm</type><boot dev='hd'/></os><features><acpi/><apic/><pae/></features><clock offset='utc'/><on_poweroff>destroy</on_poweroff><on_reboot>restart</on_reboot><on_crash>restart</on_crash><devices><emulator>/usr/bin/kvm-spice</emulator><disk type='file' device='disk'><driver name='qemu' type='raw'/><source file='/home/tankz/Desktop/Images/test.img'/><target dev='hda' bus='ide'/><alias name='ide0-0-0'/><address type='drive' controller='0' bus='0' target='0' unit='0'/></disk><disk type='block' device='cdrom'><driver name='qemu' type='raw'/><target dev='hdc' bus='ide'/><readonly/><alias name='ide0-1-0'/><address type='drive' controller='0' bus='1' target='0' unit='0'/></disk><controller type='usb' index='0'><alias name='usb0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x2'/></controller><controller type='pci' index='0' model='pci-root'><alias name='pci.0'/></controller><controller type='ide' index='0'><alias name='ide0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x1'/></controller><controller type='virtio-serial' index='0'><alias name='virtio-serial0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x05' function='0x0'/></controller><interface type='network'><mac address='52:54:00:62:94:ac'/><source network='default'/><target dev='vnet0'/><model type='rtl8139'/><alias name='net0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x03' function='0x0'/></interface><serial type='pty'><source path='/dev/pts/26'/><target port='0'/><alias name='serial0'/></serial><console type='pty' tty='/dev/pts/26'><source path='/dev/pts/26'/><target type='serial' port='0'/><alias name='serial0'/></console><channel type='spicevmc'><target type='virtio' name='com.redhat.spice.0'/><alias name='channel0'/><address type='virtio-serial' controller='0' bus='0' port='1'/></channel><input type='mouse' bus='ps2'/><input type='keyboard' bus='ps2'/><graphics type='spice' port='5900' autoport='yes' listen='127.0.0.1'><listen type='address' address='127.0.0.1'/></graphics><video><model type='qxl' ram='65536' vram='65536' heads='1'/><alias name='video0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x02' function='0x0'/></video><memballoon model='virtio'><alias name='balloon0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x04' function='0x0'/></memballoon></devices><seclabel type='dynamic' model='apparmor' relabel='yes'><label>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</label><imagelabel>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</imagelabel></seclabel></domain>"
var hardcoded_xml2 = "<domain type='kvm' id='7'><name>PLEASEESEE2</name><uuid>d81d1eb8-798b-2462-0859-6853f7172aad</uuid><memory unit='KiB'>1048576</memory><currentMemory unit='KiB'>1048576</currentMemory><vcpu placement='static'>1</vcpu><resource><partition>/machine</partition></resource><os><type arch='x86_64' machine='pc-i440fx-trusty'>hvm</type><boot dev='hd'/></os><features><acpi/><apic/><pae/></features><clock offset='utc'/><on_poweroff>destroy</on_poweroff><on_reboot>restart</on_reboot><on_crash>restart</on_crash><devices><emulator>/usr/bin/kvm-spice</emulator><disk type='file' device='disk'><driver name='qemu' type='raw'/><source file='/home/tankz/Desktop/Images/test.img'/><target dev='hda' bus='ide'/><alias name='ide0-0-0'/><address type='drive' controller='0' bus='0' target='0' unit='0'/></disk><disk type='block' device='cdrom'><driver name='qemu' type='raw'/><target dev='hdc' bus='ide'/><readonly/><alias name='ide0-1-0'/><address type='drive' controller='0' bus='1' target='0' unit='0'/></disk><controller type='usb' index='0'><alias name='usb0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x2'/></controller><controller type='pci' index='0' model='pci-root'><alias name='pci.0'/></controller><controller type='ide' index='0'><alias name='ide0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x01' function='0x1'/></controller><controller type='virtio-serial' index='0'><alias name='virtio-serial0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x05' function='0x0'/></controller><interface type='network'><mac address='52:54:00:62:94:ac'/><source network='default'/><target dev='vnet0'/><model type='rtl8139'/><alias name='net0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x03' function='0x0'/></interface><serial type='pty'><source path='/dev/pts/26'/><target port='0'/><alias name='serial0'/></serial><console type='pty' tty='/dev/pts/26'><source path='/dev/pts/26'/><target type='serial' port='0'/><alias name='serial0'/></console><channel type='spicevmc'><target type='virtio' name='com.redhat.spice.0'/><alias name='channel0'/><address type='virtio-serial' controller='0' bus='0' port='1'/></channel><input type='mouse' bus='ps2'/><input type='keyboard' bus='ps2'/><graphics type='spice' port='5900' autoport='yes' listen='127.0.0.1'><listen type='address' address='127.0.0.1'/></graphics><video><model type='qxl' ram='65536' vram='65536' heads='1'/><alias name='video0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x02' function='0x0'/></video><memballoon model='virtio'><alias name='balloon0'/><address type='pci' domain='0x0000' bus='0x00' slot='0x04' function='0x0'/></memballoon></devices><seclabel type='dynamic' model='apparmor' relabel='yes'><label>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</label><imagelabel>libvirt-d81d1eb8-798b-2462-0859-6853f7172cdd</imagelabel></seclabel></domain>"